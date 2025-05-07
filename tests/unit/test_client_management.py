import pytest
from django.urls import reverse
from django.utils import timezone
from django.test import Client as TestClient
from moma.models import Client, CustomUser, Task, Project
from moma.serializers import ClientSerializer

@pytest.mark.django_db
class TestClientManagement:
    """
    Test suite for client management functionality.
    Tests client creation, updates, and task associations.
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
        
        self.valid_client_data = {
            'name': 'Test Client',
            'email': 'client@example.com',
            'phone_number': '+44123456789',
            'linkedin': 'https://linkedin.com/in/testclient',
            'details': 'Test client details',
            'active': 'active'
        }
    
    def test_create_client_valid_data(self):
        """
        Test successful client creation with valid data.
        Verify that a new client is created with all attributes.
        """
        serializer = ClientSerializer(data=self.valid_client_data)
        assert serializer.is_valid()
        
        client = serializer.save(user=self.user)
        assert client.name == self.valid_client_data['name']
        assert client.email == self.valid_client_data['email']
        assert client.phone_number == self.valid_client_data['phone_number']
        assert client.linkedin == self.valid_client_data['linkedin']
        assert client.details == self.valid_client_data['details']
        assert client.active == self.valid_client_data['active']
    
    def test_client_with_associated_tasks(self):
        """
        Test client creation with associated tasks.
        Verify that tasks are correctly associated with the client.
        """
        # Create client
        client = Client.objects.create(
            user=self.user,
            name='Test Client',
            active='active'
        )
        
        # Create associated tasks
        tasks = [
            Task.objects.create(
                user=self.user,
                name=f'Task {i}',
                client=client,
                priority='high'
            ) for i in range(3)
        ]
        
        # Verify task associations
        client_tasks = Task.objects.filter(client=client)
        assert client_tasks.count() == len(tasks)
        assert set(t.id for t in client_tasks) == set(t.id for t in tasks)
    
    def test_update_client_details(self):
        """
        Test updating client details.
        Verify that client information can be updated and changes are saved.
        """
        # Create initial client
        client = Client.objects.create(
            user=self.user,
            name='Initial Client',
            email='initial@example.com',
            active='active'
        )
        
        # Update client details
        updated_data = {
            'name': 'Updated Client',
            'email': 'updated@example.com',
            'phone_number': '+44987654321',
            'active': 'inactive'
        }
        
        serializer = ClientSerializer(client, data=updated_data, partial=True)
        assert serializer.is_valid()
        updated_client = serializer.save()
        
        # Verify updates
        assert updated_client.name == updated_data['name']
        assert updated_client.email == updated_data['email']
        assert updated_client.phone_number == updated_data['phone_number']
        assert updated_client.active == updated_data['active']
    
    def test_client_status_updates(self):
        """
        Test client status updates.
        Verify that client status changes are handled correctly.
        """
        # Create client
        client = Client.objects.create(
            user=self.user,
            name='Test Client',
            active='active'
        )
        
        # Create associated tasks and projects
        task = Task.objects.create(
            user=self.user,
            name='Test Task',
            client=client
        )
        project = Project.objects.create(
            user=self.user,
            name='Test Project',
            client=client
        )
        
        # Update client status to inactive
        client.active = 'inactive'
        client.save()
        
        # Verify task and project associations are maintained
        task.refresh_from_db()
        project.refresh_from_db()
        assert task.client == client
        assert project.client == client
    
    def test_delete_client(self):
        """
        Test client deletion.
        Verify that client deletion is handled correctly and associated tasks are updated.
        """
        # Create client
        client = Client.objects.create(
            user=self.user,
            name='Test Client',
            active='active'
        )
        
        # Create associated task
        task = Task.objects.create(
            user=self.user,
            name='Test Task',
            client=client
        )
        
        # Delete client through the API
        response = self.client.post(
            reverse('delete_marked_clients_api'),
            {'client_ids': [client.id]},
            content_type='application/json'
        )
        assert response.status_code == 200
        assert response.json()['success'] is True
        
        # Verify client is deleted
        assert not Client.objects.filter(id=client.id).exists()
        
        # Verify task client reference is set to None
        task.refresh_from_db()
        assert task.client is None 