from django.urls import path, include
from . import views

urlpatterns = [
    path("auth/", include("djoser.urls")),
    path("auth/", include("djoser.urls.jwt")),
    path("login/", views.login_view, name="login"),
    path("signup/", views.signup_view, name="signup"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
]