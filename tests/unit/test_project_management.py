import pytest
from django.urls import reverse
from django.utils import timezone
from django.test import Client as TestClient
from moma.models import Project, SubTask, CustomUser, Client
from moma.forms import ProjectCreationForm

@pytest.mark.django_db
class TestProjectManagement:
    """
    Test suite for project management functionality.
    Tests project creation, subtask management, and related operations.
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
        
        self.valid_project_data = {
            'name': 'Test Project',
            'priority': 'medium',
            'due_date': timezone.now().date(),
            'client': self.test_client.id,
            'is_my_business': False
        }
    
    def test_create_project_valid_data(self):
        """
        Test successful project creation with valid data.
        Verify that a new project is created with all attributes.
        """
        form = ProjectCreationForm(data=self.valid_project_data, user=self.user)
        assert form.is_valid()
        
        project = form.save()
        assert project.name == self.valid_project_data['name']
        assert project.priority == self.valid_project_data['priority']
        assert project.due_date == self.valid_project_data['due_date']
        assert project.client == self.test_client
        assert project.status == 'not_started'
    
    def test_project_with_subtasks(self):
        """
        Test project creation with multiple subtasks.
        Verify that subtasks are created and associated correctly.
        """
        # Create project
        project = Project.objects.create(
            user=self.user,
            name='Test Project',
            priority='medium'
        )
        
        # Create subtasks
        subtasks = [
            'Initial Setup',
            'Development',
            'Testing'
        ]
        
        for subtask_name in subtasks:
            SubTask.objects.create(
                project=project,
                name=subtask_name
            )
        
        # Verify subtasks
        project_subtasks = SubTask.objects.filter(project=project)
        assert project_subtasks.count() == len(subtasks)
        assert set(st.name for st in project_subtasks) == set(subtasks)
    
    def test_update_project_status(self):
        """
        Test project status updates through the completion workflow.
        Verify that status changes are saved and reflected correctly.
        """
        # Create a project
        project = Project.objects.create(
            user=self.user,
            name='Test Project',
            priority='medium',
            status='not_started'
        )
        
        # Update status to in_progress
        project.status = 'in_progress'
        project.save()
        project.refresh_from_db()
        assert project.status == 'in_progress'
        
        # Update status to done
        project.status = 'done'
        project.save()
        project.refresh_from_db()
        assert project.status == 'done'
    
    def test_edit_project_subtasks(self):
        """
        Test editing project subtasks.
        Verify that subtasks can be added, edited, and deleted.
        """
        # Create project
        project = Project.objects.create(
            user=self.user,
            name='Test Project',
            priority='medium'
        )
        
        # Create initial subtask
        subtask = SubTask.objects.create(
            project=project,
            name='Initial Task'
        )
        
        # Edit subtask
        subtask.name = 'Updated Task'
        subtask.save()
        subtask.refresh_from_db()
        assert subtask.name == 'Updated Task'
        
        # Delete subtask
        subtask_id = subtask.id
        subtask.delete()
        assert not SubTask.objects.filter(id=subtask_id).exists()
        
        # Add new subtask
        new_subtask = SubTask.objects.create(
            project=project,
            name='New Task'
        )
        assert new_subtask in project.subtask_set.all() 