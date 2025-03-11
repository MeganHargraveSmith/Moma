from django.core.exceptions import ValidationError

class CustomPasswordValidator:
    def validate(self, password, user=None):
        if not any(char.isupper() for char in password):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not any(char.islower() for char in password):
            raise ValidationError('Password must contain at least one lowercase letter.')
        if not any(char.isdigit() for char in password):
            raise ValidationError('Password must contain at least one number.')

    def get_help_text(self):
        return 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'