import json
import logging
from datetime import datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from .forms import CustomUserCreationForm, TaskCreationForm, ProjectCreationForm
from .models import CustomUser, Client, Task, Project, SubTask, Bookkeeping
from .serializers import ClientSerializer
from django.db.models import F
import os
from django.views.decorators.cache import cache_page
from django.core.cache import cache
from django.utils import timezone


logger = logging.getLogger(__name__)  # Sets up a logger for the module.


def login_view(request):
    """
    Handle user login with rate-limiting for excessive attempts.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        # Rate-limiting logic
        ip_address = request.META.get('REMOTE_ADDR')  # Retrieves the user's IP address.
        cache_key = f'login_attempts_{ip_address}'  # Creates a cache key for tracking login attempts.
        attempts = cache.get(cache_key, 0)  # Retrieves the number of attempts from the cache.
        
        if attempts >= 5:  # Allows 5 attempts per hour.
            return JsonResponse({'success': False, 'error': 'Too many login attempts. Please try again later.'}, status=403)  # Returns an error response if too many attempts are made.
        
        email = request.POST.get('email')  # Retrieves the email from the POST data.
        password = request.POST.get('password')  # Retrieves the password from the POST data.
        user = authenticate(request, email=email, password=password)  # Authenticates the user.
        
        if user is not None:  # Checks if the user is authenticated successfully.
            login(request, user)  # Logs the user in.
            request.session.cycle_key()  # Regenerates session ID for security.
            cache.delete(cache_key)  # Resets attempts on successful login.
            return redirect('dashboard')  # Redirects to the dashboard after successful login.
        else:
            messages.error(request, 'Invalid email or password.')  # Displays an error message for invalid credentials.
            cache.set(cache_key, attempts + 1, timeout=3600)  # Increments attempts and caches for 1 hour.
    
    return render(request, 'login.html')  # Renders the login page for GET requests.


def signup_view(request):
    """
    Handle user signup and account creation.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        form = CustomUserCreationForm(request.POST)  # Creates a form instance with the submitted data.
        if form.is_valid():  # Validates the form data.
            user = form.save()  # Saves the new user instance.
            print(f"User created: {user.email}")  # Logs the created user's email.
            messages.success(request, 'Account successfully created')  # Displays a success message.
            return redirect('login')  # Redirects to the login page after successful signup.
        else:
            print("Form errors:", form.errors)  # Logs any form errors.
            for error in form.errors.values():  # Iterates through form errors.
                messages.error(request, error)  # Displays each error message.
    else:
        form = CustomUserCreationForm()  # Creates an empty form for GET requests.

    return render(request, 'signup.html', {'form': form})  # Renders the signup page with the form.


@login_required
def clients_view(request):
    """
    Display the list of clients associated with the logged-in user.
    Remove and delete clients marked as removed.
    """
    removed_clients = Client.objects.filter(user=request.user, active='removed')  # Retrieves clients marked as removed.
    for client in removed_clients:  # Iterates through removed clients.
        Task.objects.filter(client=client).update(client=None)  # Updates tasks to remove references to the removed client.
        Project.objects.filter(client=client).update(client=None)  # Updates projects to remove references to the removed client.
        client.delete()  # Deletes the removed client.
    
    clients = Client.objects.filter(user=request.user)  # Retrieves the list of active clients for the logged-in user.
    return render(request, 'clients.html', {'clients': clients})  # Renders the clients page with the list of clients.


@login_required
def bookkeeping(request):
    """
    Display the bookkeeping records associated with the logged-in user.
    """
    bookkeeping_records = Bookkeeping.objects.filter(user=request.user).order_by(
        F('payment_date').asc(nulls_first=True),  # Orders records by payment date, placing nulls first.
        '-payment_date'  # Orders records by payment date in descending order.
    )
    return render(request, 'bookkeeping.html', {'bookkeeping_records': bookkeeping_records})  # Renders the bookkeeping page with the records.


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_active_clients(request):
    """
    Retrieve and return active and prospective clients for the logged-in user.
    """
    try:
        user = request.user  # Retrieves the logged-in user.
        logger.debug(f"=== Starting active_clients view ===")  # Logs the start of the view.
        logger.debug(f"User: {user.email} (ID: {user.id})")  # Logs the user's email and ID.
        all_clients = Client.objects.filter(user=user)  # Retrieves all clients for the user.
        logger.debug(f"Total clients for user: {all_clients.count()}")  # Logs the total number of clients.
        logger.debug(f"All clients: {list(all_clients.values('id', 'name', 'active'))}")  # Logs all clients' details.
        
        query = Client.objects.filter(
            user=user,
            active__in=['active', 'prospective']  # Filters clients to include only active and prospective ones.
        ).values('id', 'name').query  # Prepares a query for the filtered clients.
        logger.debug(f"SQL Query: {str(query)}")  # Logs the SQL query.
        
        clients = Client.objects.filter(
            user=user,
            active__in=['active', 'prospective']  # Filters clients to include only active and prospective ones.
        ).values('id', 'name')  # Retrieves the filtered clients' IDs and names.
        
        logger.debug(f"Found {clients.count()} active/prospective clients")  # Logs the count of active/prospective clients.
        logger.debug(f"Active/prospective clients: {list(clients)}")  # Logs the details of active/prospective clients.
        
        from django.db import connection
        with connection.cursor() as cursor:  # Uses a raw SQL query to fetch client details.
            cursor.execute("""
                SELECT id, name, active 
                FROM moma_client 
                WHERE user_id = %s AND active IN ('active', 'prospective')
            """, [user.id])  # Executes the SQL query with the user's ID.
            raw_results = cursor.fetchall()  # Fetches all results from the query.
            logger.debug(f"Raw SQL results: {raw_results}")  # Logs the raw SQL results.
        
        clients_list = list(clients)  # Converts the queryset to a list.
        logger.debug(f"Final clients list: {clients_list}")  # Logs the final list of clients.
        logger.debug("=== End of active_clients view ===")  # Logs the end of the view.
        return JsonResponse({
            'clients': clients_list  # Returns the list of clients as a JSON response.
        })
        
    except Exception as e:
        logger.error(f"Error in active_clients view: {str(e)}", exc_info=True)  # Logs any errors that occur.
        return JsonResponse({
            'error': 'Failed to fetch clients',  # Returns an error message.
            'details': str(e)  # Includes details of the error.
        }, status=500)  # Returns a 500 status code for server errors.


@api_view(['GET', 'POST'])
@login_required
def manage_clients(request):
    """
    Handle client management, including retrieval and creation of clients.
    """
    if request.method == 'GET':  # Checks if the request method is GET.
        clients = Client.objects.filter(user=request.user)  # Retrieves clients for the logged-in user.
        serializer = ClientSerializer(clients, many=True)  # Serialises the client data.
        return Response({'clients': serializer.data})  # Returns the serialised client data as a response.

    elif request.method == 'POST':  # Checks if the request method is POST.
        logger.info(f"Received client data: {request.data}")  # Logs the received client data.
        serializer = ClientSerializer(data=request.data)  # Creates a serializer instance with the submitted data.
        if serializer.is_valid():  # Validates the serializer data.
            serializer.save(user=request.user)  # Saves the new client instance associated with the user.
            return Response(serializer.data, status=201)  # Returns the created client data with a 201 status code.
        logger.error(f"Serializer errors: {serializer.errors}")  # Logs any serializer errors.
        return Response(serializer.errors, status=400)  # Returns the errors with a 400 status code.


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_business_name(request):
    """
    Retrieve and return the business name of the logged-in user.
    """
    business_name = request.user.business_name  # Retrieves the business name from the user instance.
    return Response({'business_name': business_name})  # Returns the business name as a JSON response.


@login_required
@cache_page(60 * 15)  # Caches the view for 15 minutes.
def dashboard_view(request):
    """
    Display the dashboard for the logged-in user, including tasks and projects.
    """
    try:
        logger.info("=== Loading dashboard ===")  # Logs the start of the dashboard loading.
        tasks = Task.objects.filter(user=request.user).exclude(status__in=['done', 'cancelled']).select_related('client')  # Retrieves tasks for the user, excluding completed or cancelled tasks.
        projects = Project.objects.filter(user=request.user).exclude(status__in=['done', 'cancelled']).prefetch_related('subtask_set')  # Retrieves projects for the user, excluding completed or cancelled projects.
        active_clients = Client.objects.filter(user=request.user, active__in=['active', 'prospective']).only('id', 'name')  # Retrieves active and prospective clients for the user.
        logger.info(f"Found {tasks.count()} tasks and {projects.count()} projects")  # Logs the count of tasks and projects.
        logger.info("Tasks data:")  # Logs the tasks data.

        for task in tasks:  # Iterates through the tasks.
            logger.info(f"Task ID: {task.id}, Name: {task.name}, is_my_business: {task.is_my_business}, client: {task.client}")  # Logs details of each task.
        logger.info("Projects data:")  # Logs the projects data.
        for project in projects:  # Iterates through the projects.
            logger.info(f"Project ID: {project.id}, Name: {project.name}, is_my_business: {project.is_my_business}, client: {project.client}")  # Logs details of each project.
        
        logger.info(f"Rendering dashboard with projects: {projects}")  # Logs the projects being rendered.
        logger.info(f"Rendering dashboard with tasks: {tasks}")  # Logs the tasks being rendered.
        
        todos = list(tasks) + list(projects)  # Combines tasks and projects into a single list.
        priority_order = {'high': 0, 'medium': 1, 'low': 2}  # Defines the order of priority.
        todos.sort(key=lambda x: (  # Sorts the todos based on priority and due date.
            priority_order.get(x.priority.lower(), 3),  # Sorts by priority, defaulting to a lower value for unknown priorities.
            x.due_date is None,  # Places tasks without a due date last.
            x.due_date or datetime.max  # Sorts by due date, using max date for tasks without a due date.
        ))
        
        context = {
            'todos': todos,  # Prepares the todos for rendering.
            'today_date': datetime.now().strftime('%Y-%m-%d'),  # Gets today's date for display.
            'active_clients': active_clients,  # Prepares active clients for rendering.
        }
        logger.info("=== End of dashboard loading ===")  # Logs the end of the dashboard loading.
        return render(request, 'dashboard.html', context)  # Renders the dashboard page with the context data.
    except Exception as e:
        logger.error(f"Error in dashboard_view: {str(e)}")  # Logs any errors that occur during dashboard loading.
        logger.error(f"User: {request.user}")  # Logs the user associated with the error.
        logger.error(f"Tasks count: {tasks.count() if 'tasks' in locals() else 'Not loaded'}")  # Logs the count of tasks if available.
        logger.error(f"Projects count: {projects.count() if 'projects' in locals() else 'Not loaded'}")  # Logs the count of projects if available.
        raise  # Raises the exception to be handled by the framework.


@login_required
def create_task_view(request):
    """
    Handle the creation of a new task. Requires authentication.
    """
    if not request.user.is_authenticated:  # Checks if the user is authenticated.
        return JsonResponse({'success': False, 'errors': 'Authentication required'}, status=403)  # Returns an error response if not authenticated.
    
    if request.method == 'POST':  # Checks if the request method is POST.
        try:
            data = json.loads(request.body)  # Parses the JSON body of the request.
            logger.info(f"=== Creating new task ===")  # Logs the start of task creation.
            logger.info(f"Raw request data: {data}")  # Logs the raw request data.
            
            is_my_business = data.get('is_my_business', False)  # Retrieves the business flag from the request data.
            if isinstance(is_my_business, str):  # Checks if the value is a string.
                is_my_business = is_my_business.lower() == 'true'  # Converts the string to a boolean.
            logger.info(f"is_my_business value: {is_my_business} (raw: {data.get('is_my_business')})")  # Logs the business flag value.
            
            task = Task(  # Creates a new task instance.
                user=request.user,  # Associates the task with the logged-in user.
                name=data.get('name'),  # Retrieves the task name from the request data.
                priority=data.get('priority'),  # Retrieves the task priority from the request data.
                due_date=data.get('due_date'),  # Retrieves the task due date from the request data.
                is_my_business=is_my_business  # Sets the business flag for the task.
            )
            
            client_id = data.get('client')  # Retrieves the client ID from the request data.
            if client_id:  # Checks if a client ID is provided.
                task.client = get_object_or_404(Client, id=client_id, user=request.user)  # Links the task to the specified client.
                logger.info(f"Task assigned to client: {task.client.name} (ID: {client_id})")  # Logs the client assignment.
            else:
                task.client = None  # Sets the client to None if no client ID is provided.
                logger.info("Task has no client assigned")  # Logs that no client is assigned.
                
            task.save()  # Saves the new task instance.
            logger.info(f"Task created successfully. ID: {task.id}, is_my_business: {task.is_my_business}")  # Logs the successful creation of the task.
            logger.info("=== End of task creation ===")  # Logs the end of task creation.
            return JsonResponse({'success': True})  # Returns a success response.
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")  # Logs any errors that occur during task creation.
            return JsonResponse({'success': False, 'errors': str(e)})  # Returns an error response.
    return JsonResponse({'success': False, 'errors': 'Invalid request method'})  # Returns an error response for invalid request methods.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_task(request):
    """
    Update the specified task for the logged-in user.
    """
    task_id = request.data.get('id')  # Retrieves the task ID from the request data.
    task = get_object_or_404(Task, id=task_id, user=request.user)  # Retrieves the task or raises a 404 error.
    
    if 'name' in request.data:  # Checks if the task name is provided.
        task.name = request.data['name']  # Updates the task name.
    if 'priority' in request.data:  # Checks if the task priority is provided.
        task.priority = request.data['priority']  # Updates the task priority.
    if 'status' in request.data:  # Checks if the task status is provided.
        task.status = request.data['status']  # Updates the task status.
    if 'due_date' in request.data:  # Checks if the task due date is provided.
        task.due_date = request.data['due_date']  # Updates the task due date.
    if 'client' in request.data:  # Checks if the client ID is provided.
        client_id = request.data['client']  # Retrieves the client ID.
        if client_id:  # Checks if a client ID is provided.
            task.client = get_object_or_404(Client, id=client_id, user=request.user)  # Links the task to the specified client.
        else:
            task.client = None  # Sets the client to None if no client ID is provided.
    if 'is_my_business' in request.data:  # Checks if the business flag is provided.
        task.is_my_business = request.data['is_my_business'].lower() == 'true'  # Updates the business flag.
    
    task.save()  # Saves the updated task instance.
    return Response({'success': True})  # Returns a success response.


@login_required
def create_project_view(request):
    """
    Handle the creation of a new project. Requires authentication.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        try:
            data = json.loads(request.body)  # Parses the JSON body of the request.
            logger.info(f"Creating project with data: {data}")  # Logs the project creation data.
            is_my_business = data.get('is_my_business', 'false').lower() == 'true'  # Retrieves and converts the business flag.
            logger.info(f"is_my_business value: {is_my_business} (raw: {data.get('is_my_business')})")  # Logs the business flag value.
            
            project = Project(  # Creates a new project instance.
                user=request.user,  # Associates the project with the logged-in user.
                name=data.get('name'),  # Retrieves the project name from the request data.
                priority=data.get('priority'),  # Retrieves the project priority from the request data.
                due_date=data.get('due_date'),  # Retrieves the project due date from the request data.
                is_my_business=is_my_business  # Sets the business flag for the project.
            )
            
            client_id = data.get('client')  # Retrieves the client ID from the request data.
            if client_id:  # Checks if a client ID is provided.
                project.client = get_object_or_404(Client, id=client_id, user=request.user)  # Links the project to the specified client.
            else:
                project.client = None  # Sets the client to None if no client ID is provided.
                
            project.save()  # Saves the new project instance.
            logger.info(f"Project created successfully. ID: {project.id}, is_my_business: {project.is_my_business}")  # Logs the successful creation of the project.
            subtasks = data.get('subtasks', [])  # Retrieves any subtasks from the request data.

            for subtask_data in subtasks:  # Iterates through the provided subtasks.
                SubTask.objects.create(  # Creates a new subtask instance.
                    project=project,  # Links the subtask to the project.
                    name=subtask_data.get('name'),  # Retrieves the subtask name from the data.
                    status=subtask_data.get('status', 'not_started')  # Retrieves the subtask status, defaulting to 'not_started'.
                )
                
            return JsonResponse({'success': True})  # Returns a success response.
        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")  # Logs any errors that occur during project creation.
            return JsonResponse({'success': False, 'errors': str(e)})  # Returns an error response.
    return JsonResponse({'success': False, 'errors': 'Invalid request method'})  # Returns an error response for invalid request methods.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_project(request):
    """
    Update the specified project for the logged-in user.
    """
    project_id = request.data.get('id')  # Retrieves the project ID from the request data.
    project = get_object_or_404(Project, id=project_id, user=request.user)  # Retrieves the project or raises a 404 error.
    
    if 'name' in request.data:  # Checks if the project name is provided.
        project.name = request.data['name']  # Updates the project name.
    if 'priority' in request.data:  # Checks if the project priority is provided.
        project.priority = request.data['priority']  # Updates the project priority.
    if 'status' in request.data:  # Checks if the project status is provided.
        project.status = request.data['status']  # Updates the project status.
    if 'due_date' in request.data:  # Checks if the project due date is provided.
        project.due_date = request.data['due_date']  # Updates the project due date.
    if 'client' in request.data:  # Checks if the client ID is provided.
        client_id = request.data['client']  # Retrieves the client ID.
        if client_id:  # Checks if a client ID is provided.
            project.client = get_object_or_404(Client, id=client_id, user=request.user)  # Links the project to the specified client.
        else:
            project.client = None  # Sets the client to None if no client ID is provided.
    if 'is_my_business' in request.data:  # Checks if the business flag is provided.
        project.is_my_business = request.data['is_my_business'].lower() == 'true'  # Updates the business flag.
    
    project.save()  # Saves the updated project instance.
    return Response({'success': True})  # Returns a success response.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_subtask(request):
    """
    Update the specified subtask for the logged-in user.
    """
    subtask_id = request.data.get('id')  # Retrieves the subtask ID from the request data.
    subtask = get_object_or_404(SubTask, id=subtask_id, project__user=request.user)  # Retrieves the subtask or raises a 404 error.
    
    if 'name' in request.data:  # Checks if the subtask name is provided.
        subtask.name = request.data['name']  # Updates the subtask name.
    if 'status' in request.data:  # Checks if the subtask status is provided.
        subtask.status = request.data['status']  # Updates the subtask status.
    
    subtask.save()  # Saves the updated subtask instance.
    return Response({'success': True})  # Returns a success response.


@login_required
def update_task_status(request):
    """
    Update the status of the specified task for the logged-in user.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        data = json.loads(request.body)  # Parses the JSON body of the request.
        task_id = data.get('id')  # Retrieves the task ID from the request data.
        new_status = data.get('status')  # Retrieves the new status from the request data.
        
        try:
            task = Task.objects.get(id=task_id, user=request.user)  # Retrieves the task or raises a 404 error.
            task.status = new_status  # Updates the task status.
            task.save()  # Saves the updated task instance.
            return JsonResponse({'success': True})  # Returns a success response.
        except Task.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Task not found'}, status=404)  # Returns an error response if the task does not exist.
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)  # Returns an error response for invalid request methods.


@login_required
def update_project_status(request):
    """
    Update the status of the specified project for the logged-in user.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        data = json.loads(request.body)  # Parses the JSON body of the request.
        project_id = data.get('id')  # Retrieves the project ID from the request data.
        new_status = data.get('status')  # Retrieves the new status from the request data.
        
        try:
            project = Project.objects.get(id=project_id, user=request.user)  # Retrieves the project or raises a 404 error.
            project.status = new_status  # Updates the project status.
            project.save()  # Saves the updated project instance.
            return JsonResponse({'success': True})  # Returns a success response.
        except Project.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Project not found'}, status=404)  # Returns an error response if the project does not exist.
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)  # Returns an error response for invalid request methods.


@login_required
def update_subtask_status(request):
    """
    Update the status of the specified subtask for the logged-in user.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        data = json.loads(request.body)  # Parses the JSON body of the request.
        subtask_id = data.get('id')  # Retrieves the subtask ID from the request data.
        new_status = data.get('status')  # Retrieves the new status from the request data.
        try:
            subtask = SubTask.objects.get(id=subtask_id, project__user=request.user)  # Retrieves the subtask or raises a 404 error.
            subtask.status = new_status  # Updates the subtask status.
            subtask.save()  # Saves the updated subtask instance.
            return JsonResponse({'success': True})  # Returns a success response.
        except SubTask.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Subtask not found'}, status=404)  # Returns an error response if the subtask does not exist.
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)  # Returns an error response for invalid request methods.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_client(request):
    """
    Update the specified client for the logged-in user.
    """
    client_id = request.data.get('id')  # Retrieves the client ID from the request data.
    client = get_object_or_404(Client, id=client_id, user=request.user)  # Retrieves the client or raises a 404 error.
    
    if 'name' in request.data:  # Checks if the client name is provided.
        client.name = request.data['name']  # Updates the client name.
    if 'active' in request.data:  # Checks if the client status is provided.
        client.active = request.data['active']  # Updates the client status.
    if 'phone_number' in request.data:  # Checks if the phone number is provided.
        client.phone_number = request.data['phone_number']  # Updates the client phone number.
    if 'email' in request.data:  # Checks if the email is provided.
        client.email = request.data['email']  # Updates the client email.
    if 'linkedin' in request.data:  # Checks if the LinkedIn URL is provided.
        client.linkedin = request.data['linkedin']  # Updates the client LinkedIn URL.
    if 'details' in request.data:  # Checks if additional details are provided.
        details = request.data['details'].strip()  # Strips whitespace from the details.
        if details:  # Checks if details are not empty.
            client.details = details  # Updates the client details.
        else:
            client.details = None  # Sets details to None if empty.
    try:
        client.save()  # Saves the updated client instance.
        return Response({'success': True})  # Returns a success response.
    except Exception as e:
        logger.error(f"Error updating client: {str(e)}")  # Logs any errors that occur during client update.
        return Response({'success': False, 'error': str(e)}, status=400)  # Returns an error response.


@login_required
def update_client_status(request, client_id):
    """
    Update the status of the specified client for the logged-in user.
    """
    if request.method == 'POST':  # Checks if the request method is POST.
        try:
            data = json.loads(request.body)  # Parses the JSON body of the request.
            new_status = data.get('status')  # Retrieves the new status from the request data.
            if new_status not in ['active', 'inactive', 'prospective', 'removed']:  # Validates the new status.
                return JsonResponse({'success': False, 'error': 'Invalid status'})  # Returns an error response for invalid status.
            client = get_object_or_404(Client, id=client_id, user=request.user)  # Retrieves the client or raises a 404 error.
            client.active = new_status  # Updates the client status.
            client.save()  # Saves the updated client instance.
            return JsonResponse({'success': True})  # Returns a success response.
        except Exception as e:
            logger.error(f"Error updating client status: {str(e)}")  # Logs any errors that occur during client status update.
            return JsonResponse({'success': False, 'error': str(e)})  # Returns an error response.
    return JsonResponse({'success': False, 'error': 'Invalid request method'})  # Returns an error response for invalid request methods.


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def get_client_details(request, client_id):
    """
    Retrieve and return the details of the specified client for the logged-in user.
    """
    client = get_object_or_404(Client, id=client_id, user=request.user)  # Retrieves the client or raises a 404 error.
    serializer = ClientSerializer(client)  # Serialises the client data.
    return Response(serializer.data)  # Returns the serialised client data as a response.


@api_view(['PATCH'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_client_details(request, client_id):
    """
    Update the details of the specified client for the logged-in user.
    """
    try:
        client = get_object_or_404(Client, id=client_id, user=request.user)  # Retrieves the client or raises a 404 error.
        serializer = ClientSerializer(client, data=request.data, partial=True)  # Creates a serializer instance with the submitted data.
        
        if serializer.is_valid():  # Validates the serializer data.
            serializer.save()  # Saves the updated client instance.
            return Response(serializer.data)  # Returns the updated client data as a response.
        return Response(serializer.errors, status=400)  # Returns the errors with a 400 status code.
    except Exception as e:
        logger.error(f"Error updating client details: {str(e)}")  # Logs any errors that occur during client details update.
        return Response({'error': str(e)}, status=500)  # Returns an error response.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_client(request):
    """
    Create a new client for the logged-in user.
    """
    try:
        logger.info(f"Creating client with data: {request.data}")  # Logs the client creation data.
        status = request.data.get('active', 'active')  # Retrieves the client status from the request data, defaulting to 'active'.
        if status not in ['active', 'inactive', 'prospective']:  # Validates the status value.
            return Response({'error': 'Invalid status value'}, status=400)  # Returns an error response for invalid status.
        
        client = Client.objects.create(  # Creates a new client instance.
            user=request.user,  # Associates the client with the logged-in user.
            name=request.data.get('name', ''),  # Retrieves the client name from the request data.
            details=request.data.get('details', ''),  # Retrieves additional details from the request data.
            phone_number=request.data.get('phone_number', ''),  # Retrieves the phone number from the request data.
            email=request.data.get('email', ''),  # Retrieves the email from the request data.
            linkedin=request.data.get('linkedin', ''),  # Retrieves the LinkedIn URL from the request data.
            active=status  # Sets the client status.
        )
        
        serializer = ClientSerializer(client)  # Serialises the created client data.
        logger.info(f"Client created successfully: {serializer.data}")  # Logs the successful creation of the client.
        return Response(serializer.data, status=201)  # Returns the created client data with a 201 status code.
        
    except Exception as e:
        logger.error(f"Error creating client: {str(e)}")  # Logs any errors that occur during client creation.
        return Response({'error': str(e)}, status=400)  # Returns an error response.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def create_bookkeeping_record(request):
    """
    Create a new bookkeeping record for the logged-in user.
    """
    try:
        record = Bookkeeping.objects.create(  # Creates a new bookkeeping record instance.
            user=request.user,  # Associates the record with the logged-in user.
            document_number=request.data.get('document_number', ''),  # Retrieves the document number from the request data.
            business=request.data.get('business', ''),  # Retrieves the business name from the request data.
            invoice_date=request.data.get('invoice_date'),  # Retrieves the invoice date from the request data.
            payment_date=request.data.get('payment_date'),  # Retrieves the payment date from the request data.
            amount=request.data.get('amount', 0)  # Retrieves the amount from the request data.
        )
        return Response({'success': True, 'record_id': record.id})  # Returns a success response with the record ID.
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=400)  # Returns an error response if an exception occurs.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def update_bookkeeping_record(request):
    """
    Update the specified bookkeeping record for the logged-in user.
    """
    record_id = request.data.get('id')  # Retrieves the record ID from the request data.
    record = get_object_or_404(Bookkeeping, id=record_id, user=request.user)  # Retrieves the record or raises a 404 error.
    
    if 'document_number' in request.data:  # Checks if the document number is provided.
        record.document_number = request.data['document_number']  # Updates the document number.
    if 'business' in request.data:  # Checks if the business name is provided.
        record.business = request.data['business']  # Updates the business name.
    if 'invoice_date' in request.data:  # Checks if the invoice date is provided.
        record.invoice_date = request.data['invoice_date']  # Updates the invoice date.
    if 'payment_date' in request.data:  # Checks if the payment date is provided.
        record.payment_date = request.data['payment_date']  # Updates the payment date.
    if 'amount' in request.data:  # Checks if the amount is provided.
        record.amount = request.data['amount']  # Updates the amount.
    
    try:
        record.save()  # Saves the updated record.
        return Response({'success': True})  # Returns a success response.
    except Exception as e:
        return Response({'success': False, 'error': str(e)}, status=400)  # Returns an error response if an exception occurs.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def upload_bookkeeping_document(request):
    """
    Upload a document for the specified bookkeeping record of the logged-in user.
    """
    record_id = request.data.get('id')  # Retrieves the record ID from the request data.
    record = get_object_or_404(Bookkeeping, id=record_id, user=request.user)  # Retrieves the record or raises a 404 error.
    if 'document' in request.FILES:  # Checks if a document is included in the request.
        file = request.FILES['document']  # Retrieves the uploaded file.
        if file.content_type not in ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:  # Validates the file type.
            return Response({'success': False, 'error': 'Invalid file type'}, status=400)  # Returns an error response for invalid file types.
        record.document = file  # Assigns the uploaded file to the record.
        record.original_filename = file.name  # Stores the original filename.
        record.save()  # Saves the updated record.
        return Response({'success': True, 'converted_pdf_url': record.converted_pdf.url})  # Returns a success response with the converted PDF URL.
    
    return Response({'success': False, 'error': 'No file provided'}, status=400)  # Returns an error response if no file is provided.


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def delete_bookkeeping_records(request):
    """
    Delete specified bookkeeping records for the logged-in user.
    """
    try:
        record_ids = request.data.get('record_ids', [])  # Retrieves the list of record IDs from the request data.
        if not record_ids:  # Checks if any record IDs are provided.
            return Response({'success': False, 'error': 'No records selected for deletion'}, status=400)  # Returns an error response if no records are selected.
        if not isinstance(record_ids, list):  # Checks if the record IDs are in a list format.
            return Response({'success': False, 'error': 'Invalid record IDs format'}, status=400)  # Returns an error response for invalid format.
        try:
            record_ids = [int(id) for id in record_ids]  # Converts record IDs to integers.
        except (ValueError, TypeError):
            return Response({'success': False, 'error': 'Invalid record ID format'}, status=400)  # Returns an error response for invalid ID format.
            
        records = Bookkeeping.objects.filter(id__in=record_ids, user=request.user)  # Retrieves the records for the logged-in user.
        found_ids = set(records.values_list('id', flat=True))  # Gets the IDs of the found records.
        missing_ids = set(record_ids) - found_ids  # Identifies any missing IDs that were not found.
        
        if missing_ids:  # Checks if there are any missing IDs.
            return Response({
                'success': False, 
                'error': f'Some records not found or not owned by user: {missing_ids}'  # Returns an error response for missing records.
            }, status=404)
        try:
            for record in records:  # Iterates through the found records.
                record.delete()  # Deletes each record.
            return Response({'success': True})  # Returns a success response.
        except Exception as e:
            logger.error(f"Error deleting bookkeeping records: {str(e)}")  # Logs any errors that occur during deletion.
            return Response({
                'success': False, 
                'error': 'An error occurred while deleting records'  # Returns an error response for deletion errors.
            }, status=500)
            
    except Exception as e:
        logger.error(f"Unexpected error in delete_bookkeeping_records: {str(e)}")  # Logs any unexpected errors.
        return Response({
            'success': False, 
            'error': 'An unexpected error occurred'  # Returns an error response for unexpected errors.
        }, status=500)


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def delete_marked_clients(request):
    """
    Delete specified clients for the logged-in user.
    """
    try:
        client_ids = request.data.get('client_ids', [])  # Retrieves the list of client IDs from the request data.
        if not client_ids:  # Checks if any client IDs are provided.
            return Response({'success': False, 'error': 'No clients selected for deletion'}, status=400)  # Returns an error response if no clients are selected.
            
        # First update all tasks and projects to remove client references
        Task.objects.filter(client_id__in=client_ids, user=request.user).update(client=None)  # Updates tasks to remove references to the clients being deleted.
        Project.objects.filter(client_id__in=client_ids, user=request.user).update(client=None)  # Updates projects to remove references to the clients being deleted.
        
        # Then delete the clients
        deleted_count = Client.objects.filter(id__in=client_ids, user=request.user).delete()[0]  # Deletes the specified clients and counts the number of deleted clients.
        
        return Response({
            'success': True,
            'message': f'Successfully deleted {deleted_count} clients'  # Returns a success message with the count of deleted clients.
        })
    except Exception as e:
        logger.error(f"Error deleting marked clients: {str(e)}")  # Logs any errors that occur during client deletion.
        return Response({'success': False, 'error': str(e)}, status=400)  # Returns an error response.