from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0003_alter_event_hero_image'),
    ]

    operations = [
        migrations.RenameField(
            model_name='event',
            old_name='discipline',
            new_name='event_type',
        ),
        migrations.AlterField(
            model_name='event',
            name='event_type',
            field=models.CharField(
                max_length=20,
                choices=[('marathon', 'Marathon'), ('duathlon', 'Duathlon'), ('triathlon', 'Triathlon')],
            ),
        ),
    ]
