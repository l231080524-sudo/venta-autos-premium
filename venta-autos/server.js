import express from 'express';
import pg from 'pg';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'HOLA',
  database: 'venta-autos',
});

// Test de conexión y auto-actualización de la base de datos
pool.query('SELECT NOW()', async (err, res) => {
  if (err) {
    console.error('❌ Error crítico al conectar a PostgreSQL:', err.message);
  } else {
    console.log('✅ PostgreSQL conectado exitosamente.');
    try {
      // 🚀 MAGIA: Se agrega la columna de compras automáticamente si no existía
      await pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS compras_totales INTEGER DEFAULT 0');
      console.log('✅ Base de datos actualizada para soportar historial de compras.');
    } catch (e) {
      console.log('Nota DB:', e.message);
    }
  }
});

// ==========================================================================
// 1. ENDPOINTS DE VEHÍCULOS
// ==========================================================================
app.get('/api/vehiculos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM vehiculos ORDER BY precio ASC');
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehiculos', async (req, res) => {
  const { marca, modelo, anio, precio, categoria, imagen, descripcion, stock, especificaciones } = req.body;
  try {
    await pool.query(
      'INSERT INTO vehiculos (marca, modelo, anio, precio, categoria, imagen, descripcion, stock, especificaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [marca, modelo, anio, precio, categoria, imagen, descripcion, stock, especificaciones]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehiculos/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ error: 'No data to update' });
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const values = [id, ...keys.map(key => updates[key])];
    await pool.query(`UPDATE vehiculos SET ${setClause} WHERE id = $1`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vehiculos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM apartados WHERE vehiculo_id = $1', [id]);
    await pool.query('DELETE FROM vehiculos WHERE id = $1', [id]);
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 2. ENDPOINTS DE USUARIOS (Clientes y Admins)
// ==========================================================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const usuarioQuery = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuarioQuery.rows.length === 0) return res.status(401).json({ error: 'El correo no está registrado.' });
    
    const usuario = usuarioQuery.rows[0];
    if (usuario.password_hash !== password) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    
    res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/registro', async (req, res) => {
  const { nombre, email, password, telefono } = req.body;
  try {
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Este correo electrónico ya está registrado.' });

    const nuevoUsuario = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol',
      [nombre, email, password, 'cliente', telefono]
    );
    res.status(201).json(nuevoUsuario.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener usuarios + su conteo de compras
app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT id, nombre, email, rol, telefono, compras_totales FROM usuarios ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar un Admin desde Cero
app.post('/api/usuarios/admin', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Ya existe una cuenta con este correo.' });

    await pool.query(
      "INSERT INTO usuarios (nombre, email, password_hash, rol, telefono) VALUES ($1, $2, $3, 'admin', 'Staff Interno')",
      [nombre, email, password]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 NUEVO: Endpoint para ACTUALIZAR usuarios (Nombre y Rol)
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, rol } = req.body;
  try {
    // Si no manda nada para actualizar
    if (!nombre && !rol) {
      return res.status(400).json({ error: 'No se enviaron datos para actualizar' });
    }

    const resultado = await pool.query(
      'UPDATE usuarios SET nombre = COALESCE($1, nombre), rol = COALESCE($2, rol) WHERE id = $3 RETURNING id',
      [nombre, rol, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, mensaje: 'Usuario actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚀 NUEVO: Endpoint para ELIMINAR usuarios (Revocar cuentas)
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Primero, por seguridad, borrar o desligar sus apartados/compras si existen (opcional, dependiendo de tu lógica de negocio)
    await pool.query('DELETE FROM apartados WHERE usuario_id = $1', [id]);
    
    // Luego borrar al usuario
    const resultado = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id]);
    
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, mensaje: 'Cuenta revocada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 3. ENDPOINTS DE APARTADOS Y PAGOS
// ==========================================================================
app.get('/api/apartados', async (req, res) => {
  const { usuario_id } = req.query;
  try {
    const consulta = `
      SELECT a.id, v.marca, v.modelo, v.precio, v.categoria, v.imagen 
      FROM apartados a INNER JOIN vehiculos v ON a.vehiculo_id = v.id
      WHERE a.usuario_id = $1 AND a.status = 'apartado'
    `;
    const resultado = await pool.query(consulta, [usuario_id]);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/apartados', async (req, res) => {
  const { usuario_id, vehiculo_id } = req.body;
  try {
    const vehiculo = await pool.query('SELECT stock FROM vehiculos WHERE id = $1', [vehiculo_id]);
    if (vehiculo.rows.length === 0 || vehiculo.rows[0].stock <= 0) return res.status(400).json({ error: 'Sin stock.' });

    const existe = await pool.query('SELECT id FROM apartados WHERE usuario_id = $1 AND vehiculo_id = $2 AND status = $3', [usuario_id, vehiculo_id, 'apartado']);
    if (existe.rows.length > 0) return res.status(400).json({ error: 'Ya lo tienes en tu carrito.' });

    await pool.query('INSERT INTO apartados (usuario_id, vehiculo_id, status) VALUES ($1, $2, $3)', [usuario_id, vehiculo_id, 'apartado']);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/apartados/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM apartados WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Liquidar y Actualizar historial del usuario
app.post('/api/apartados/pagar', async (req, res) => {
  const { usuario_id, apartados_ids } = req.body;
  try {
    await pool.query('BEGIN');
    
    // Restamos el inventario
    for (const id_apartado of apartados_ids) {
      const apart = await pool.query('SELECT vehiculo_id FROM apartados WHERE id = $1', [id_apartado]);
      if (apart.rows.length > 0) {
        await pool.query('UPDATE vehiculos SET stock = stock - 1 WHERE id = $1 AND stock > 0', [apart.rows[0].vehiculo_id]);
      }
    }

    // 🚀 MAGIA: Sumamos la cantidad de vehículos al historial del cliente
    await pool.query('UPDATE usuarios SET compras_totales = compras_totales + $1 WHERE id = $2', [apartados_ids.length, usuario_id]);

    // Limpiamos el carrito
    const placeholders = apartados_ids.map((_, i) => `$${i + 2}`).join(',');
    await pool.query(`DELETE FROM apartados WHERE usuario_id = $1 AND id IN (${placeholders})`, [usuario_id, ...apartados_ids]);

    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('🚀 Servidor conector de PostgreSQL corriendo en http://localhost:3000');
});