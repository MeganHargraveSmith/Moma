from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.core.exceptions import ValidationError

User = get_user_model()

class CustomUserCreationForm(UserCreationForm):
    password2 = forms.CharField(label="Confirm Password", widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'business_name', 'password1', 'password2']

    def clean(self):
        cleaned_data = super().clean()
        password1 = cleaned_data.get("password1")
        confirm_password = cleaned_data.get("password2")

        if password1 and confirm_password and password1 != confirm_password:
            raise ValidationError("Passwords must match.")

        return cleaned_data

class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ['email', 'full_name', 'business_name']