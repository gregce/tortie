from django.urls import path, re_path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("items/", views.items),
    re_path(r"^x/$", views.x),
]
