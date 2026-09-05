"""One-off dev seed script: python manage.py shell < seed_demo_data.py"""
from accounts.models import User
from events.models import Event, EventCategory

staff = [
    ('eventdirector', User.Role.EVENT_DIRECTOR, 'Eve', 'Director'),
    ('financeofficer', User.Role.FINANCE_OFFICER, 'Finn', 'Officer'),
    ('opsmanager', User.Role.OPERATIONS_MANAGER, 'Oscar', 'Manager'),
]
for username, role, first, last in staff:
    if not User.objects.filter(username=username).exists():
        u = User(username=username, email=f'{username}@tandikan.test', role=role, first_name=first, last_name=last)
        u.set_password('StaffPass123!')
        u.save()
        print('created', username)

if not Event.objects.filter(title='Tandikan Tri 2026').exists():
    tri = Event.objects.create(
        title='Tandikan Tri 2026', description='Swim, bike, and run through Puerto Princesa.',
        venue='Puerto Princesa', date='2026-10-12', discipline=Event.Discipline.TRIATHLON,
        status=Event.Status.PUBLISHED,
    )
    EventCategory.objects.create(event=tri, name='Solo', fee=25000, total_slots=150, is_relay=False)
    EventCategory.objects.create(
        event=tri, name='Relay', fee=16000, total_slots=200, is_relay=True,
        relay_roles=['Swimmer', 'Cyclist', 'Runner'],
    )
    print('created Tandikan Tri 2026')

if not Event.objects.filter(title='Palawan Duathlon Sprint').exists():
    duath = Event.objects.create(
        title='Palawan Duathlon Sprint', description='Run, bike, run sprint duathlon.',
        venue='Puerto Princesa', date='2026-12-12', discipline=Event.Discipline.DUATHLON,
        status=Event.Status.PUBLISHED,
    )
    EventCategory.objects.create(event=duath, name='Solo', fee=16000, total_slots=100, is_relay=False)
    EventCategory.objects.create(
        event=duath, name='Relay', fee=8000, total_slots=100, is_relay=True,
        relay_roles=['Runner', 'Cyclist'],
    )
    print('created Palawan Duathlon Sprint')

if not Event.objects.filter(title='IBP Marathon').exists():
    marathon = Event.objects.create(
        title='IBP Marathon', description='Road running event with 5 distance categories.',
        venue='Iwahig, Puerto Princesa', date='2026-12-10', discipline=Event.Discipline.MARATHON,
        status=Event.Status.PUBLISHED,
    )
    for name, fee, slots in [('3K', 500, 300), ('5K', 1700, 300), ('10K', 2200, 250), ('21K', 3500, 200), ('42K', 4500, 150)]:
        EventCategory.objects.create(event=marathon, name=name, fee=fee, total_slots=slots, is_relay=False)
    print('created IBP Marathon')

print('done')
