# Generated by Django 5.1.7 on 2025-04-20 15:56

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('moma', '0012_project_is_my_business_task_is_my_business'),
    ]

    operations = [
        migrations.AddField(
            model_name='bookkeeping',
            name='original_filename',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
