from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError
from .models import Client, Task, Project

User = get_user_model()

class CustomUserCreationForm(UserCreationForm):
    """
    Form for creating a new user account.
    Includes validation for password confirmation.
    """
    # Defines a field for confirming the password
    password2 = forms.CharField(label="Confirm Password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['email', 'user_name', 'business_name', 'password1', 'password2']

    def clean(self):
        """
        Validates that the passwords match.
        Raises a ValidationError if they do not match.
        """
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        confirm_password = cleaned_data.get("password2")

        if password1 and confirm_password and password1 != confirm_password:
            raise ValidationError("Passwords must match.")

        return cleaned_data

class CustomUserChangeForm(UserChangeForm):
    """
    Form for updating an existing user account.
    """
    class Meta:
        model = User
        fields = ['email', 'user_name', 'business_name']

class TaskCreationForm(forms.ModelForm):
    """
    Form for creating a new task.
    Filters the client queryset based on the logged-in user.
    """
    class Meta:
        model = Task
        fields = ['name', 'priority', 'client', 'is_my_business', 'due_date']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialises the form and sets the client queryset based on the user.
        """
        self.user = kwargs.pop('user', None)
        super(TaskCreationForm, self).__init__(*args, **kwargs)
        self.fields['client'].queryset = Client.objects.none()
        self.fields['client'].required = False

        if self.user is not None:
            try:
                clients = Client.objects.filter(user=self.user)
                self.fields['client'].queryset = clients
            except Client.DoesNotExist:
                pass

    def save(self, commit=True):
        """
        Saves the task instance, associating it with the user.
        """
        instance = super().save(commit=False)
        if self.user:
            instance.user = self.user
        if commit:
            instance.save()
        return instance

class ProjectCreationForm(forms.ModelForm):
    """
    Form for creating a new project.
    Filters the client queryset based on the logged-in user.
    """
    class Meta:
        model = Project
        fields = ['name', 'priority', 'client', 'is_my_business', 'due_date']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        """
        Initialises the form and sets the client queryset based on the user.
        """
        self.user = kwargs.pop('user', None)
        super(ProjectCreationForm, self).__init__(*args, **kwargs)
        self.fields['client'].queryset = Client.objects.none()
        self.fields['client'].required = False

        if self.user is not None:
            try:
                clients = Client.objects.filter(user=self.user)
                self.fields['client'].queryset = clients
            except Client.DoesNotExist:
                pass

    def save(self, commit=True):
        """
        Saves the project instance, associating it with the user.
        """
        instance = super().save(commit=False)
        if self.user:
            instance.user = self.user
        if commit:
            instance.save()
        return instance