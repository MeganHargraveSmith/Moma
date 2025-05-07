from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from .utils import sanitize_filename, validate_file_size, delete_file_if_exists, convert_to_pdf
import os


class CustomUserManager(BaseUserManager):
    """
    Manager for creating and managing CustomUser instances.
    """
    def create_user(self, email, user_name, password=None, **extra_fields):
        """
        Creates and returns a user with an email, username, and password.
        Raises a ValueError if the email is not provided.
        """
        if not email:  # Checks if the email is provided.
            raise ValueError('The Email field must be set')  # Raises an error if email is missing.
        email = self.normalize_email(email)  # Normalises the email address.
        user = self.model(email=email, user_name=user_name, **extra_fields)  # Creates a new user instance.
        user.set_password(password)  # Sets the user's password securely.
        user.save(using=self._db)  # Saves the user instance to the database.
        return user  # Returns the created user instance.

    def create_superuser(self, email, user_name, password=None, **extra_fields):
        """
        Creates and returns a superuser with the given email and username.
        Sets is_staff and is_superuser to True.
        """
        extra_fields.setdefault('is_staff', True)  # Ensures the superuser has staff status.
        extra_fields.setdefault('is_superuser', True)  # Ensures the superuser has superuser status.

        return self.create_user(email, user_name, password, **extra_fields)  # Calls create_user to create the superuser.



class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model that uses email as the username.
    Includes fields for user information and permissions.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the user.
    user_name = models.CharField(max_length=255, unique=True)  # Stores the unique username.
    email = models.EmailField(unique=True)  # Stores the unique email address.
    business_name = models.CharField(max_length=255, blank=True)  # Stores the business name, if provided.
    is_active = models.BooleanField(default=True)  # Indicates if the user account is active.
    is_staff = models.BooleanField(default=False)  # Indicates if the user has staff privileges.

    objects = CustomUserManager()  # Sets the custom user manager for this model.

    USERNAME_FIELD = 'email'  # Specifies the field to use for authentication.
    REQUIRED_FIELDS = ['user_name']  # Specifies additional fields required for creating a user.

    class Meta:
        app_label = 'moma'  # Sets the application label for the model.

    def __str__(self):
        """
        Returns a string representation of the user.
        """
        return self.email  # Returns the user's email as the string representation.



class Client(models.Model):
    """
    Model representing a client associated with a user.
    Includes fields for client details and status.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the client.
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # Links the client to a specific user.
    name = models.CharField(max_length=255)  # Stores the client's name.
    details = models.TextField(blank=True, null=True)  # Stores additional details about the client.
    phone_number = models.CharField(max_length=20, blank=True, null=True)  # Stores the client's phone number.
    email = models.EmailField(blank=True, null=True)  # Stores the client's email address.
    linkedin = models.URLField(blank=True, null=True)  # Stores the client's LinkedIn profile URL.
    ACTIVE_CHOICES = [
        ('active', 'Active'),  # Indicates the client is currently active.
        ('inactive', 'Inactive'),  # Indicates the client is no longer active.
        ('prospective', 'Prospective'),  # Indicates the client is a potential future client.
        ('removed', 'Removed'),  # Indicates the client has been removed.
    ]
    active = models.CharField(max_length=20, choices=ACTIVE_CHOICES, default='active')  # Stores the client's status.

    def __str__(self):
        """
        Returns a string representation of the client.
        """
        return self.name  # Returns the client's name as the string representation.



class Task(models.Model):
    """
    Model representing a task associated with a user and client.
    Includes fields for task details and status.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the task.
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # Links the task to a specific user.
    client = models.ForeignKey(Client, on_delete=models.DO_NOTHING, blank=True, null=True, db_column='client_id')  # Links the task to a specific client, if applicable.
    is_my_business = models.BooleanField(default=False)  # Indicates if the task is related to the user's business.
    name = models.CharField(max_length=100)  # Stores the name of the task.
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),  # Indicates the task has not yet begun.
        ('in_progress', 'In Progress'),  # Indicates the task is currently being worked on.
        ('awaiting_approval', 'Awaiting Approval'),  # Indicates the task is awaiting approval.
        ('editing', 'Editing'),  # Indicates the task is being edited.
        ('done', 'Done'),  # Indicates the task has been completed.
        ('cancelled', 'Cancelled')  # Indicates the task has been cancelled.
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')  # Stores the current status of the task.
    PRIORITY_CHOICES = [
        ('high', 'High'),  # Indicates the task has high priority.
        ('medium', 'Medium'),  # Indicates the task has medium priority.
        ('low', 'Low')  # Indicates the task has low priority.
    ]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True, null=True)  # Stores the priority of the task.
    due_date = models.DateField(blank=True, null=True)  # Stores the due date for the task.

    def __str__(self):
        """
        Returns a string representation of the task.
        """
        return self.name  # Returns the task's name as the string representation.



class Project(models.Model):
    """
    Model representing a project associated with a user and client.
    Includes fields for project details and status.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the project.
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # Links the project to a specific user.
    client = models.ForeignKey(Client, on_delete=models.DO_NOTHING, blank=True, null=True, db_column='client_id')  # Links the project to a specific client, if applicable.
    is_my_business = models.BooleanField(default=False)  # Indicates if the project is related to the user's business.
    name = models.CharField(max_length=255)  # Stores the name of the project.
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),  # Indicates the project has not yet begun.
        ('in_progress', 'In Progress'),  # Indicates the project is currently being worked on.
        ('awaiting_approval', 'Awaiting Approval'),  # Indicates the project is awaiting approval.
        ('editing', 'Editing'),  # Indicates the project is being edited.
        ('done', 'Done'),  # Indicates the project has been completed.
        ('cancelled', 'Cancelled')  # Indicates the project has been cancelled.
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')  # Stores the current status of the project.
    PRIORITY_CHOICES = [
        ('high', 'High'),  # Indicates the project has high priority.
        ('medium', 'Medium'),  # Indicates the project has medium priority.
        ('low', 'Low')  # Indicates the project has low priority.
    ]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True, null=True)  # Stores the priority of the project.
    due_date = models.DateField(blank=True, null=True)  # Stores the due date for the project.

    def __str__(self):
        """
        Returns a string representation of the project.
        """
        return self.name  # Returns the project's name as the string representation.



class SubTask(models.Model):
    """
    Model representing a subtask associated with a project.
    Includes fields for subtask details and status.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the subtask.
    project = models.ForeignKey(Project, on_delete=models.CASCADE)  # Links the subtask to a specific project.
    name = models.CharField(max_length=255)  # Stores the name of the subtask.
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),  # Indicates the subtask has not yet begun.
        ('in_progress', 'In Progress'),  # Indicates the subtask is currently being worked on.
        ('awaiting_approval', 'Awaiting Approval'),  # Indicates the subtask is awaiting approval.
        ('editing', 'Editing'),  # Indicates the subtask is being edited.
        ('done', 'Done'),  # Indicates the subtask has been completed.
        ('cancelled', 'Cancelled')  # Indicates the subtask has been cancelled.
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')  # Stores the current status of the subtask.

    def __str__(self):
        """
        Returns a string representation of the subtask.
        """
        return self.name  # Returns the subtask's name as the string representation.



class Bookkeeping(models.Model):
    """
    Model representing bookkeeping entries associated with a user.
    Includes fields for financial details and document uploads.
    """
    id = models.AutoField(primary_key=True)  # Defines the primary key for the bookkeeping entry.
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # Links the entry to a specific user.
    document_number = models.CharField(max_length=255, blank=True, null=True)  # Stores the document number.
    business = models.CharField(max_length=255, blank=True, null=True)  # Stores the business name.
    invoice_date = models.DateField(blank=True, null=True)  # Records the date of the invoice.
    payment_date = models.DateField(blank=True, null=True)  # Records the date of payment.
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(0),  # Validates that the amount is not negative.
            MaxValueValidator(1000000)  # Validates that the amount does not exceed one million.
        ]
    )
    
    def user_directory_path(instance, filename):
        """
        Generates the directory path for user-uploaded documents.
        """
        safe_filename = sanitize_filename(filename)  # Sanitises the filename to prevent issues.
        return f'user_{instance.user.id}/bookkeeping/{safe_filename}'  # Returns the path for the document.

    document = models.FileField(
        upload_to=user_directory_path,  # Specifies the upload path for the document.
        validators=[
            FileExtensionValidator(allowed_extensions=['pdf', 'png', 'jpg', 'jpeg', 'docx']),  # Validates file extensions.
            validate_file_size  # Validates the size of the uploaded file.
        ],
        blank=True,
        null=True
    )
    original_filename = models.CharField(max_length=255, blank=True, null=True)  # Stores the original filename.
    converted_pdf = models.FileField(
        upload_to='converted_pdfs/',  # Specifies the upload path for converted PDFs.
        blank=True,
        null=True
    )

    def __str__(self):
        """
        Returns a string representation of the bookkeeping entry.
        """
        return f"{self.document_number} - {self.business}"  # Formats the string output.

    def save(self, *args, **kwargs):
        """
        Saves the bookkeeping entry and processes the document if it is new or changed.
        """
        super().save(*args, **kwargs)  # Calls the parent class's save method.
        
        if self.document and (not self.pk or self.document != self._state.fields_cache.get('document')):  # Checks if the document is new or changed.
            try:
                pdf_path = convert_to_pdf(self.document.path, self.original_filename)  # Converts the document to PDF.
                self.converted_pdf.name = os.path.relpath(pdf_path, settings.MEDIA_ROOT)  # Sets the path for the converted PDF.
                super().save(*args, **kwargs)  # Saves the updated entry.
            except Exception as e:
                if self.document:  # Checks if the document exists.
                    delete_file_if_exists(self.document.path)  # Deletes the document if an error occurs.
                raise ValidationError(f'Failed to process document: {str(e)}')  # Raises a validation error.

    def delete(self, *args, **kwargs):
        """
        Deletes the bookkeeping entry and associated files.
        """
        if self.document:  # Checks if the document exists.
            delete_file_if_exists(self.document.path)  # Deletes the document.
        if self.converted_pdf:  # Checks if the converted PDF exists.
            delete_file_if_exists(self.converted_pdf.path)  # Deletes the converted PDF.
        super().delete(*args, **kwargs)  # Calls the parent class's delete method.