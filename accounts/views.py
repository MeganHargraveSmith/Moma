from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from .forms import CustomUserCreationForm
from .models import CustomUser

def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
        
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, email=email, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid email or password.')
    
    return render(request, 'login.html')

def signup_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            print(f"User created: {user.email}")
            login(request, user)
            messages.success(request, 'Registration successful! You are now logged in.')
            return redirect('dashboard')
        else:
            print("Form errors:", form.errors) 
            for error in form.errors.values():
                messages.error(request, error)
    else:
        form = CustomUserCreationForm()

    return render(request, 'signup.html', {'form': form})

@login_required
def dashboard_view(request):
    return render(request, 'dashboard.html')