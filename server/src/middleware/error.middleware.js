export function errorMiddleware(err, req, res, next) {
  console.error('Global Error Handler caught:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    // Provide stack trace in development mode for easier debugging
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
