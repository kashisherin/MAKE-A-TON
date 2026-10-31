from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'success' in response.data:
            return response
        response.data = {'success': False, 'errors': response.data}
    return response
