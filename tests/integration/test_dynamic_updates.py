import pytest
import json
from django.urls import reverse
from django.utils import timezone
from django.test import Client as TestClient
from moma.models import CustomUser, Task, Project, SubTask
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

@pytest.fixture
def test_user():
    """
    Creates and returns a test user for testing purposes.
    The user has a standard role with no special permissions.
    """
    return User.objects.create_user(
        email=f'test_{uuid.uuid4()}@example.com',  # Generate a unique email
        user_name=f'testuser_{uuid.uuid4()}',  # Generate a unique user_name
        password='testpass123'
    )

@pytest.mark.django_db
class TestDynamicUpdates:
    """
    Test suite for dynamic updates functionality.
    Tests real-time updates and data synchronization.
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
        # Login the user
        self.client.force_login(self.user)
    
    def test_task_updates(self):
        """
        Test real-time task updates.
        Verify that task changes are reflected immediately without page refresh.
        """
        # Create initial task
        task = Task.objects.create(
            user=self.user,
            name='Test Task',
            status='not_started',
            priority='high'
        )
        
        # Update task status
        response = self.client.post(
            reverse('update_task_api'),
            data={
                'id': task.id,
                'status': 'in_progress'
            },
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify task was updated
        task.refresh_from_db()
        assert task.status == 'in_progress'
        
        # Check dashboard reflects changes
        response = self.client.get(reverse('dashboard'))
        content = response.content.decode()
        assert 'in_progress' in content
        assert task.name in content
    
    def test_project_updates(self, test_user, test_project):
        """
        Test real-time project updates.
        Verify that project changes are reflected immediately.
        """
        # Update project status
        response = self.client.post(
            reverse('update_project_api'),
            data={
                'id': test_project.id,
                'status': 'in_progress'
            },
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify project was updated
        test_project.refresh_from_db()
        assert test_project.status == 'in_progress'
        
        # Check dashboard reflects changes
        response = self.client.get(reverse('dashboard'))
        content = response.content.decode()
        print(content)  # Debugging: Print the rendered HTML
        assert 'in_progress' in content
        assert test_project.name in content
    
    def test_subtask_updates(self, test_user, test_project, test_subtask):
        """
        Test real-time subtask updates.
        Verify that subtask changes are reflected immediately.
        """
        # Update subtask status
        response = self.client.post(
            reverse('update_subtask_api'),
            data={
                'id': test_subtask.id,
                'status': 'in_progress'
            },
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify subtask was updated
        test_subtask.refresh_from_db()
        assert test_subtask.status == 'in_progress'
        
        # Check project view reflects changes
        response = self.client.get(reverse('dashboard'))
        content = response.content.decode()
        print(content)  # Debugging: Print the rendered HTML
        assert 'in_progress' in content
        assert test_subtask.name in content
    
    def test_concurrent_updates(self):
        """
        Test handling of concurrent updates.
        Verify that multiple simultaneous updates are handled correctly.
        """
        # Create multiple tasks
        tasks = [
            Task.objects.create(
                user=self.user,
                name=f'Task {i}',
                status='not_started',
                priority='high'
            ) for i in range(5)
        ]
        
        # Simulate concurrent updates
        for task in tasks:
            response = self.client.post(
                reverse('update_task_api'),
                data={
                    'id': task.id,
                    'status': 'in_progress'
                },
                content_type='application/json'
            )
            assert response.status_code == 200
        
        # Verify all tasks were updated
        for task in tasks:
            task.refresh_from_db()
            assert task.status == 'in_progress'
    
    def test_error_handling_during_updates(self):
        """
        Test error handling during dynamic updates.
        Verify that the system handles update errors gracefully.
        """
        # Test invalid task update
        response = self.client.post(
            reverse('update_task_api'),
            data={
                'id': 99999,  # Non-existent task
                'status': 'in_progress'
            },
            content_type='application/json'
        )
        assert response.status_code == 404
        
        # Test invalid data format
        response = self.client.post(
            reverse('update_task_api'),
            data='invalid json',
            content_type='application/json'
        )
        assert response.status_code == 400
        
        # Test missing required fields
        response = self.client.post(
            reverse('update_task_api'),
            data={},
            content_type='application/json'
        )
        assert response.status_code == 404 