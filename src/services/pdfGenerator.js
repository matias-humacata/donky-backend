const PDFDocument = require('pdfkit');

/**
 * Genera un PDF con el historial completo de un vehículo
 */
function generarHistorialPDF(vehiculo, cliente, turnos, ordenesTrabajo, estadisticas) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Historial Vehículo ${vehiculo.patente}`,
      Author: 'Taller Donky',
      Subject: 'Historial completo del vehículo',
      Creator: 'Donky Backend API'
    }
  });

  // Función helper para formatear fechas
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  // HEADER
  doc.fontSize(20)
     .text('TALLER DONKY', { align: 'center' });
  
  doc.moveDown(0.5)
     .fontSize(16)
     .text('HISTORIAL DEL VEHÍCULO', { align: 'center' })
     .moveDown(0.5)
     .fontSize(10)
     .text(`Generado el: ${formatDate(new Date())}`, { align: 'center' })
     .moveDown(1);

  // INFORMACIÓN DEL VEHÍCULO
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('INFORMACIÓN DEL VEHÍCULO', { underline: true })
     .moveDown(0.3)
     .font('Helvetica')
     .fontSize(11);

  const vehiculoInfo = [
    `Patente: ${vehiculo.patente}`,
    `Marca: ${vehiculo.marca}`,
    `Modelo: ${vehiculo.modelo}`,
    vehiculo.anio ? `Año: ${vehiculo.anio}` : null,
    `Kilometraje Actual: ${vehiculo.kmActual || 0} km`,
    `Fecha de Registro: ${formatDate(vehiculo.createdAt)}`
  ].filter(Boolean);

  vehiculoInfo.forEach(info => {
    doc.text(`• ${info}`);
  });

  doc.moveDown(0.5);

  // INFORMACIÓN DEL CLIENTE
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('CLIENTE', { underline: true })
     .moveDown(0.3)
     .font('Helvetica')
     .fontSize(11);

  const clienteInfo = [
    `Nombre: ${cliente.nombre}`,
    cliente.telefono ? `WhatsApp: ${cliente.telefono}` : null
  ].filter(Boolean);

  clienteInfo.forEach(info => {
    doc.text(`• ${info}`);
  });

  doc.moveDown(1);

  // ESTADÍSTICAS
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('RESUMEN GENERAL', { underline: true })
     .moveDown(0.3)
     .font('Helvetica')
     .fontSize(11);

  const resumenInfo = [
    `Total de Turnos: ${estadisticas.totalTurnos}`,
    `Turnos Confirmados: ${estadisticas.turnosConfirmados}`,
    `Total de Órdenes de Trabajo: ${estadisticas.totalOrdenesTrabajo}`,
    `Órdenes Completadas: ${estadisticas.ordenesCompletadas}`
  ];

  resumenInfo.forEach(info => {
    doc.text(`• ${info}`);
  });

  doc.moveDown(1);

  // TURNOS
  if (turnos && turnos.length > 0) {
    doc.addPage()
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('HISTORIAL DE TURNOS', { underline: true })
       .moveDown(0.3)
       .font('Helvetica')
       .fontSize(11);

    turnos.forEach((turno, index) => {
      if (doc.y > 700) {
        doc.addPage();
      }

      doc.font('Helvetica-Bold')
         .text(`Turno #${index + 1}`, { continued: false })
         .font('Helvetica');

      const turnoInfo = [
        `Fecha: ${formatDate(turno.fecha)}`,
        `Estado: ${turno.estado.toUpperCase()}`,
        `Duración: ${turno.duracionMin || 60} minutos`,
        turno.tecnico ? `Técnico: ${turno.tecnico}` : null,
        turno.aprobadoEn ? `Aprobado: ${formatDate(turno.aprobadoEn)}` : null,
        turno.canceladoEn ? `Cancelado: ${formatDate(turno.canceladoEn)}` : null
      ].filter(Boolean);

      turnoInfo.forEach(info => {
        doc.text(`  • ${info}`, { indent: 10 });
      });

      doc.moveDown(0.5);
    });
  }

  // ÓRDENES DE TRABAJO
  if (ordenesTrabajo && ordenesTrabajo.length > 0) {
    doc.addPage()
       .fontSize(14)
       .font('Helvetica-Bold')
       .text('ÓRDENES DE TRABAJO', { underline: true })
       .moveDown(0.3)
       .font('Helvetica')
       .fontSize(11);

    ordenesTrabajo.forEach((orden, index) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.font('Helvetica-Bold')
         .text(`Orden de Trabajo #${index + 1}`, { continued: false })
         .font('Helvetica');

      // Información básica
      const ordenInfo = [
        `Fecha de Creación: ${formatDate(orden.createdAt)}`,
        `Estado: ${orden.estado.toUpperCase()}`,
        orden.tecnico ? `Técnico: ${orden.tecnico}` : null,
        orden.fechaInicio ? `Inicio: ${formatDate(orden.fechaInicio)}` : null,
        orden.fechaFin ? `Fin: ${formatDate(orden.fechaFin)}` : null
      ].filter(Boolean);

      ordenInfo.forEach(info => {
        doc.text(`  • ${info}`, { indent: 10 });
      });

      // Diagnóstico
      if (orden.diagnostico && orden.diagnostico.descripcion) {
        doc.moveDown(0.2)
           .font('Helvetica-Bold')
           .text('  Diagnóstico:', { indent: 10 })
           .font('Helvetica')
           .text(orden.diagnostico.descripcion, { 
             indent: 20,
             width: 470,
             align: 'justify'
           });
      }

      // Checklist
      if (orden.checklist && orden.checklist.length > 0) {
        doc.moveDown(0.3)
           .font('Helvetica-Bold')
           .text('  Checklist:', { indent: 10 })
           .font('Helvetica');

        orden.checklist.forEach(item => {
          const check = item.realizado ? '✓' : '○';
          doc.text(`    ${check} ${item.descripcion}`, { indent: 20 });
          if (item.observaciones) {
            doc.text(`      Obs: ${item.observaciones}`, { indent: 30, font: 'Helvetica-Oblique' });
          }
        });
      }

      // Repuestos
      if (orden.repuestos && orden.repuestos.length > 0) {
        doc.moveDown(0.3)
           .font('Helvetica-Bold')
           .text('  Repuestos Utilizados:', { indent: 10 })
           .font('Helvetica');

        orden.repuestos.forEach(rep => {
          const repuestoText = `${rep.nombre}${rep.marca ? ` (${rep.marca})` : ''} - ` +
                              `Cant: ${rep.cantidad} x ${formatCurrency(rep.precioUnitario)} = ` +
                              formatCurrency(rep.total);
          doc.text(`    • ${repuestoText}`, { indent: 20 });
        });
      }

      // Presupuesto
      if (orden.presupuesto) {
        doc.moveDown(0.3)
           .font('Helvetica-Bold')
           .text('  Presupuesto:', { indent: 10 })
           .font('Helvetica');

        const presupuestoInfo = [
          `Subtotal Repuestos: ${formatCurrency(orden.presupuesto.subtotalRepuestos)}`,
          `Mano de Obra: ${formatCurrency(orden.presupuesto.subtotalManoObra)}`,
          orden.presupuesto.descuento > 0 ? `Descuento: ${formatCurrency(orden.presupuesto.descuento)}` : null,
          `TOTAL: ${formatCurrency(orden.presupuesto.total)}`
        ].filter(Boolean);

        presupuestoInfo.forEach(info => {
          doc.text(`    • ${info}`, { indent: 20 });
        });

        if (orden.presupuesto.aprobadoPorCliente) {
          doc.text(`    ✓ Aprobado por cliente el ${formatDate(orden.presupuesto.fechaAprobacion)}`, {
            indent: 20,
            font: 'Helvetica-Bold'
          });
        }
      }

      // Observaciones
      if (orden.observaciones) {
        doc.moveDown(0.3)
           .font('Helvetica-Bold')
           .text('  Observaciones:', { indent: 10 })
           .font('Helvetica')
           .text(orden.observaciones, {
             indent: 20,
             width: 460,
             align: 'justify'
           });
      }

      doc.moveDown(0.8);
    });
  }

  // FOOTER en cada página
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .font('Helvetica')
       .text(
         `Página ${i + 1} de ${pageCount} | Taller Donky - Historial Vehículo ${vehiculo.patente}`,
         50,
         doc.page.height - 30,
         {
           align: 'center',
           width: doc.page.width - 100
         }
       );
  }

  return doc;
}

module.exports = {
  generarHistorialPDF
};

