from django.core.exceptions import ValidationError

class CustomPasswordValidator:
    """
    Custom password validator to enforce password complexity requirements.
    """
    def validate(self, password, user=None):
        """
        Validates the password against complexity requirements.
        Raises a ValidationError if the password does not meet the requirements.
        """
        if not any(char.isupper() for char in password):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not any(char.islower() for char in password):
            raise ValidationError('Password must contain at least one lowercase letter.')
        if not any(char.isdigit() for char in password):
            raise ValidationError('Password must contain at least one number.')

    def get_help_text(self):
        """
        Provides help text for password requirements.
        """
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'