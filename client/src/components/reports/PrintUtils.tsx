import React from 'react';

/**
 * Hook personalizado para la impresión de reportes con React-to-Print
 * Esta función está comentada debido a problemas de tipos con la biblioteca
 * Use printContent en su lugar
 */
// export const usePrintReport = (documentTitlePrefix: string = 'تقرير') => {
//   // Implementación comentada - ver printContent para alternativa
// };

/**
 * Función auxiliar para imprimir contenido específico
 */
export const printContent = (content: HTMLElement, title: string = 'تقرير') => {
  if (!content) {
    console.error('No content element to print');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print');
    return;
  }

  // Configuración de estilo básica para imprimir
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <style>
        @media print {
          body { font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { background-color: #f2f2f2; }
        }
      </style>
    </head>
    <body>
      ${content.outerHTML}
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `);
  
  printWindow.document.close();
};