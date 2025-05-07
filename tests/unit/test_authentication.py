import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import Client as TestClient
from moma.forms import CustomUserCreationForm

User = get_user_model()

@pytest.mark.django_db
class TestUserAuthentication:
    """
    Test suite for user authentication functionality.
    Tests user registration, login, and related operations.
    """
    
    def setup_method(self):
        """
        Initialise test client and test data before each test.
        """
        self.client = TestClient()
        self.valid_user_data = {
            'email': 'test@example.com',
            'user_name': 'testuser',
            'business_name': 'Test Business',
            'password1': 'ValidPass123!',
            'password2': 'ValidPass123!'
        }
    
    def test_user_registration_valid_credentials(self):
        """
        Test successful user registration with valid credentials.
        Verify that a new user account is created and stored correctly.
        """
        form = CustomUserCreationForm(data=self.valid_user_data)
        assert form.is_valid()
        
        user = form.save()
        assert user.email == self.valid_user_data['email']
        assert user.user_name == self.valid_user_data['user_name']
        assert user.business_name == self.valid_user_data['business_name']
        assert user.check_password(self.valid_user_data['password1'])
    
    def test_user_registration_invalid_email(self):
        """
        Test user registration with invalid email format.
        Verify that the form validation fails and no user is created.
        """
        invalid_data = self.valid_user_data.copy()
        invalid_data['email'] = 'invalid-email'
        
        form = CustomUserCreationForm(data=invalid_data)
        assert not form.is_valid()
        assert 'email' in form.errors
    
    def test_user_login_valid_credentials(self):
        """
        Test successful user login with valid credentials.
        Verify that the user is authenticated and redirected correctly.
        """
        # Create a test user
        User.objects.create_user(
            email=self.valid_user_data['email'],
            user_name=self.valid_user_data['user_name'],
            password=self.valid_user_data['password1']
        )
        
        # Attempt login
        response = self.client.post(
            reverse('login'),
            {
                'email': self.valid_user_data['email'],
                'password': self.valid_user_data['password1']
            }
        )
        
        assert response.status_code == 302  # Redirect
        assert response.url == reverse('dashboard')
    
    def test_user_login_invalid_credentials(self):
        """
        Test login attempt with invalid credentials.
        Verify that authentication fails and appropriate error is shown.
        """
        response = self.client.post(
            reverse('login'),
            {
                'email': 'wrong@example.com',
                'password': 'wrongpassword'
            }
        )
        
        assert response.status_code == 200  # No redirect
        assert 'Invalid email or password' in response.content.decode() 