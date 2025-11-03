import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/database.js';

dotenv.config();

const createAdmin = async () => {
  try {
    // Conectar ao banco
    await connectDB();

    // Dados do administrador
    const adminData = {
      name: process.env.ADMIN_NAME || 'Administrador',
      email: process.env.ADMIN_EMAIL || 'admin@sistema.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin',
      phone: process.env.ADMIN_PHONE || '',
    };

    // Verificar se já existe um admin com este email
    const existingAdmin = await User.findOne({ email: adminData.email });

    if (existingAdmin) {
      console.log('⚠️  Administrador já existe com este email!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Nome:', existingAdmin.name);
      console.log('🔑 Role:', existingAdmin.role);
      
      // Perguntar se quer atualizar para admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Usuário atualizado para admin!');
      }
      
      process.exit(0);
    }

    // Criar administrador
    const admin = await User.create(adminData);

    console.log('✅ Administrador criado com sucesso!');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nome:', admin.name);
    console.log('🔑 Role:', admin.role);
    console.log('⚠️  IMPORTANTE: Altere a senha padrão após o primeiro login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error.message);
    process.exit(1);
  }
};

// Executar
createAdmin();

