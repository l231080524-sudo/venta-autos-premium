import { attributesToProps } from 'html-react-parser';
import { createElement, Fragment } from 'react';

function leerNodo(nodo) {
  if (nodo.nodeType === Node.TEXT_NODE) {
    return /[\r\n]/.test(nodo.data) && !nodo.data.trim() ? null : nodo.data;
  }
  if (nodo.nodeType !== Node.ELEMENT_NODE) return null;

  const contenido = nodo.getAttribute('data-contenido');
  if (nodo.localName === 'template' && contenido) return { contenido };

  const atributos = Object.fromEntries(nodo.getAttributeNames().map(nombre => [nombre, nodo.getAttribute(nombre)]));
  const enlace = atributos['data-enlace'] ?? atributos.id;
  delete atributos['data-enlace'];
  delete atributos['data-contenido'];
  delete atributos['data-vista'];
  return {
    etiqueta: nodo.localName,
    atributos: attributesToProps(atributos, nodo.localName),
    enlace,
    contenidoInterior: contenido,
    hijos: Array.from(nodo.childNodes, leerNodo).filter(nodo => nodo !== null),
  };
}

function montarNodo(nodo, contenido, enlaces) {
  if (typeof nodo === 'string') return nodo;
  if (nodo.contenido) return contenido[nodo.contenido];
  const props = enlaces[nodo.enlace] || {};
  const atributos = nodo.enlace ? { ...nodo.atributos, ...props } : nodo.atributos;
  if (nodo.atributos.className && Object.hasOwn(props, 'className')) {
    atributos.className = [nodo.atributos.className, props.className].filter(Boolean).join(' ');
  }
  const hijos = nodo.contenidoInterior && Object.hasOwn(contenido, nodo.contenidoInterior)
    ? [contenido[nodo.contenidoInterior]]
    : nodo.hijos.map(hijo => montarNodo(hijo, contenido, enlaces));
  return createElement(nodo.etiqueta, atributos, ...hijos);
}

export function crearVistas(html) {
  const documento = document.createElement('template');
  documento.innerHTML = html;
  const vistas = new Map(Array.from(documento.content.children, elemento => {
    if (elemento.localName === 'template') {
      return [elemento.id, Array.from(elemento.content.childNodes, leerNodo).filter(nodo => nodo !== null)];
    }
    return [elemento.dataset.vista, [leerNodo(elemento)]];
  }));

  return function vista(nombre, contenido = {}, enlaces = {}, fragmento = false) {
    const hijos = vistas.get(nombre).map(nodo => montarNodo(nodo, contenido, enlaces));
    return !fragmento && hijos.length === 1 ? hijos[0] : createElement(Fragment, null, ...hijos);
  };
}
