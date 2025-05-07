import pytest
from django.urls import reverse
from django.utils import timezone
from django.test import Client as TestClient
from moma.models import Task, CustomUser, Client
from moma.forms import TaskCreationForm

@pytest.mark.django_db
class TestTaskManagement:
    """
    Test suite for task management functionality.
    Tests task creation, updates, and related operations.
    """
    
    def setup_method(self):
        """
        Initialise test client and test data before each test.
        """
        self.client = TestClient()
        # Create a test user
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            user_name='testuser',
            password='testpass123'
        )
        # Create a test client
        self.test_client = Client.objects.create(
            user=self.user,
            name='Test Client',
            active='active'
        )
        # Login the user
        self.client.force_login(self.user)
        
        self.valid_task_data = {
            'name': 'Test Task',
            'priority': 'high',
            'due_date': timezone.now().date(),
            'client': self.test_client.id,
            'is_my_business': False
        }
    
    def test_create_task_valid_data(self):
        """
        Test successful task creation with valid data.
        Verify that a new task is created with all attributes.
        """
        form = TaskCreationForm(data=self.valid_task_data, user=self.user)
        assert form.is_valid()
        
        task = form.save()
        assert task.name == self.valid_task_data['name']
        assert task.priority == self.valid_task_data['priority']
        assert task.due_date == self.valid_task_data['due_date']
        assert task.client == self.test_client
        assert task.status == 'not_started'
    
    def test_update_task_status(self):
        """
        Test task status updates through the completion workflow.
        Verify that status changes are saved and reflected correctly.
        """
        # Create a task
        task = Task.objects.create(
            user=self.user,
            name='Test Task',
            priority='high',
            status='not_started'
        )
        
        # Update status to in_progress
        task.status = 'in_progress'
        task.save()
        task.refresh_from_db()
        assert task.status == 'in_progress'
        
        # Update status to done
        task.status = 'done'
        task.save()
        task.refresh_from_db()
        assert task.status == 'done'
    
    def test_task_creation_api(self):
        """
        Test task creation through the API endpoint.
        Verify that the API correctly creates and returns task data.
        """
        response = self.client.post(
            reverse('create_task_api'),
            data=self.valid_task_data,
            content_type='application/json'
        )
        
        assert response.status_code == 200
        assert response.json()['success'] is True
        
        # Verify task was created
        task = Task.objects.filter(user=self.user).first()
        assert task is not None
        assert task.name == self.valid_task_data['name']
    
    def test_task_filtering(self):
        """
        Test task filtering functionality.
        Verify that tasks can be filtered by priority and client.
        """
        # Create tasks with different priorities
        Task.objects.create(
            user=self.user,
            name='High Priority Task',
            priority='high',
            client=self.test_client
        )
        Task.objects.create(
            user=self.user,
            name='Low Priority Task',
            priority='low',
            client=self.test_client
        )
        
        # Filter high priority tasks
        high_priority_tasks = Task.objects.filter(
            user=self.user,
            priority='high'
        )
        assert high_priority_tasks.count() == 1
        assert high_priority_tasks.first().name == 'High Priority Task'
        
        # Filter by client
        client_tasks = Task.objects.filter(
            user=self.user,
            client=self.test_client
        )
        assert client_tasks.count() == 2 