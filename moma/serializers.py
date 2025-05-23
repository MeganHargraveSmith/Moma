from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
from .models import Client



User = get_user_model()



class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new user.
    Includes validation for password confirmation.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirmPassword = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'business_name', 'password', 'confirmPassword']

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirmPassword"):
            raise serializers.ValidationError({"password": "Passwords must match."})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            full_name=validated_data["full_name"],
            business_name=validated_data.get("business_name", validated_data["full_name"]),
            password=validated_data["password"],
        )
        user.is_active = True
        user.save()
        return user



class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for representing user data.
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'business_name']



class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for representing client data.
    """
    class Meta:
        model = Client
        fields = ['id', 'name', 'email', 'phone_number', 'active', 'linkedin', 'details']