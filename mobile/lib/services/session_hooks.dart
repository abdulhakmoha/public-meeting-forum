/// Optional callback when API returns 401 (registered by [AuthController]).
typedef UnauthorizedHandler = Future<void> Function();

UnauthorizedHandler? onApiUnauthorized;
