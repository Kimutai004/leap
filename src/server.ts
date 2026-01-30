import app from './app';
import config from './config';
import connectDB from './config/database';
import logger from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Close database connection
        import('mongoose').then(({ default: mongoose }) => {
          mongoose.connection.close();
          logger.info('Database connection closed');
          process.exit(0);
        });
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error(`Failed to start server: ${(error as Error).message}`);
    process.exit(1);
  }
};

startServer();

