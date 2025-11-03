import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI não está definida nas variáveis de ambiente');
    }

    const conn = await mongoose.connect(mongoUri, {
      // useNewUrlParser e useUnifiedTopology são opções padrão no Mongoose 6+
      // Mantidas para compatibilidade
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
    process.exit(1);
  }
};

export default connectDB;
