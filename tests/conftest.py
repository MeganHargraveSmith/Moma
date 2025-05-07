import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from moma.models import Client as ClientModel, Task, Project, Bookkeeping, SubTask

User = get_user_model()

@pytest.fixture
def test_user():
    """
    Create and return a test user for testing purposes.
    The user has a standard role with no special permissions.
    """
    return User.objects.create_user(
        email='test@example.com',
        user_name='testuser',
        password='testpass123'
    )

@pytest.fixture
def test_superuser():
    """
    Create and return a test superuser for testing purposes.
    The superuser has all permissions and can access the admin interface.
    """
    return User.objects.create_superuser(
        email='admin@example.com',
        user_name='adminuser',
        password='adminpass123'
    )

@pytest.fixture
def authenticated_client(test_user):
    """
    Create and return an authenticated test client.
    The client is logged in as the test user.
    """
    client = Client()
    client.force_login(test_user)
    return client

@pytest.fixture
def test_client(test_user):
    """
    Create and return a test client associated with the test user.
    The client is active by default.
    """
    return ClientModel.objects.create(
        user=test_user,
        name='Test Client',
        email='client@example.com',
        active='active'
    )

@pytest.fixture
def test_task(test_user, test_client):
    """
    Create and return a test task associated with the test user and client.
    The task is set to 'not_started' status by default.
    """
    return Task.objects.create(
        user=test_user,
        client=test_client,
        name='Test Task',
        priority='high',
        status='not_started'
    )

@pytest.fixture
def test_project(test_user, test_client):
    """
    Create and return a test project associated with the test user and client.
    The project is set to 'not_started' status by default.
    """
    return Project.objects.create(
        user=test_user,
        client=test_client,
        name='Test Project',
        priority='medium',
        status='not_started'
    )

@pytest.fixture
def test_subtask(test_project):
    """
    Create and return a test subtask associated with the test project.
    The subtask is set to 'not_started' status by default.
    """
    return SubTask.objects.create(
        project=test_project,
        name='Test Subtask',
        status='not_started'
    )

@pytest.fixture
def test_bookkeeping(test_user):
    """
    Create and return a test bookkeeping entry associated with the test user.
    The entry includes a document number, business name, and amount.
    """
    return Bookkeeping.objects.create(
        user=test_user,
        document_number='INV-001',
        business='Test Vendor',
        amount=100.00
    )

@pytest.fixture(autouse=True)
def media_storage(settings, tmpdir):
    """
    Configure temporary media storage for file upload tests.
    This ensures that test files are stored in a temporary directory and cleaned up after the test.
    """
    settings.MEDIA_ROOT = tmpdir.strpath

@pytest.fixture
def large_dataset(test_user):
    """
    Create a large dataset for performance testing.
    The dataset includes multiple clients, tasks, and projects.
    """
    # Create multiple clients
    clients = [
        ClientModel.objects.create(
            user=test_user,
            name=f'Client {i}',
            active='active'
        ) for i in range(100)
    ]
    
    # Create multiple tasks
    tasks = [
        Task.objects.create(
            user=test_user,
            client=clients[i % len(clients)],
            name=f'Task {i}',
            priority='high' if i % 3 == 0 else 'medium' if i % 3 == 1 else 'low',
            status='not_started'
        ) for i in range(500)
    ]
    
    # Create multiple projects
    projects = [
        Project.objects.create(
            user=test_user,
            client=clients[i % len(clients)],
            name=f'Project {i}',
            priority='high' if i % 3 == 0 else 'medium' if i % 3 == 1 else 'low',
            status='not_started'
        ) for i in range(500)
    ]
    
    return {
        'clients': clients,
        'tasks': tasks,
        'projects': projects
    } 