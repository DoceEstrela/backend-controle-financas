import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    // Se já estiver conectado, não tentar conectar novamente
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB já está conectado');
      return;
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não está definida nas variáveis de ambiente');
    }

    // Opções de conexão otimizadas para serverless
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // Manter conexões de pool reduzidas para serverless
      serverSelectionTimeoutMS: 10000, // Timeout aumentado para 10 segundos
      socketTimeoutMS: 45000, // Timeout de socket
      connectTimeoutMS: 10000, // Timeout de conexão
    });

    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Banco de dados: ${conn.connection.name}`);
    
    // Tratamento de desconexão
    mongoose.connection.on('error', (err) => {
      console.error(`❌ Erro na conexão MongoDB: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB desconectado');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB desconectado devido ao encerramento da aplicação');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ Erro ao conectar MongoDB: ${error.message}`);
    console.error('Verifique se a string de conexão MONGODB_URI está correta no arquivo .env');
    // No Vercel, não fazer process.exit() pois crasha a função serverless
    // A conexão será tentada novamente na próxima requisição
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error; // Re-throw para que o caller possa tratar
  }
};

export default connectDB;
