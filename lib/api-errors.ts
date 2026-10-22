export function unexpectedErrorResponse(context: string, error: unknown, message: string, status = 500) {
  console.error(context, error);
  return Response.json({ error: message }, { status });
}
