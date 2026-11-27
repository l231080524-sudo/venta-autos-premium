import { useState } from 'react';
import { VistaFichaVehiculo, VistaFichaUsuario } from './Tarjetas.vista.jsx';

export function AdminCarCard({ auto, onDelete, onSave }) {
  const [marca, setMarca] = useState(auto.marca || '');
  const [modelo, setModelo] = useState(auto.modelo || '');
  const [precio, setPrecio] = useState(auto.precio || '');
  const [stock, setStock] = useState(auto.stock || 0);
  const [categoria, setCategoria] = useState(auto.categoria || 'gasolina');

  const isModified =
    marca !== auto.marca ||
    modelo !== auto.modelo ||
    Number(precio) !== Number(auto.precio) ||
    Number(stock) !== Number(auto.stock) ||
    categoria !== auto.categoria;

  const handleSave = () => {
    if (!Number.isFinite(Number(precio)) || Number(precio) <= 0) {
      window.alert('El precio debe ser un número mayor que cero.');
      return;
    }
    return onSave(auto.id, {
      marca,
      modelo,
      precio: Number(precio),
      stock: Number(stock),
      categoria
    });
  };

  return <VistaFichaVehiculo {...{
    auto, onDelete, marca, setMarca, modelo, setModelo, precio, setPrecio,
    stock, setStock, categoria, setCategoria, isModified, handleSave,
  }} />;
}

export function AdminUserCard({ admin, onDelete, onSave, usuarioActualId, currentUserRole }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(admin.nombre);
  const [rol, setRol] = useState(admin.rol || 'admin');

  const esUsuarioActual = admin.id === usuarioActualId;
  const esSuperAdmin = currentUserRole === 'superadmin';

  const getBadgeColor = () => {
    if (admin.rol === 'superadmin') return 'bg-purple-500/10 text-purple-400 border border-purple-900';
    if (admin.rol === 'admin_restringido') return 'bg-amber-500/10 text-amber-400 border border-amber-900';
    return 'bg-emerald-500/10 text-emerald-400 border border-emerald-950';
  };

  const getRoleName = () => {
    if (admin.rol === 'superadmin') return 'Super Admin';
    if (admin.rol === 'admin_restringido') return 'Admin (Clientes)';
    return 'Admin';
  };

  const handleSave = () => {
    onSave(admin.id, { nombre, rol });
    setEditando(false);
  };

  return <VistaFichaUsuario {...{
    admin, onDelete, editando, setEditando, nombre, setNombre, rol, setRol,
    esUsuarioActual, esSuperAdmin, getBadgeColor, getRoleName, handleSave,
  }} />;
}
