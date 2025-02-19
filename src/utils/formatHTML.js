function renderTables(data) {
  let result = [];

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  data.forEach((item) => {
    // Crear las tablas cada dos categorías
    for (let i = 0; i < item.categorias.length; i += 2) {
      let container = "<div>";

      // Crear el elemento "p" para la fecha
      const formattedDate = new Date(item.fecha).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      container += `<p class="tableTitle">${formattedDate}</p>`;

      container += `<table class="tableStyle">`;
      container += "<thead><tr><th>Categoría</th>";
      if (item.categorias[i].tipos[0]) {
        container += `<th>${capitalize(item.categorias[i].tipos[0].tipo)}</th>`;
      }
      if (item.categorias[i].tipos[1]) {
        container += `<th>${capitalize(item.categorias[i].tipos[1].tipo)}</th>`;
      }
      container += "</tr></thead>";
      container += "<tbody>";

      for (let j = i; j < i + 2 && j < item.categorias.length; j++) {
        const categoria = item.categorias[j];
        container += "<tr>";

        // Columna 1: Nombre de la Categoría
        container += `<td>${capitalize(categoria.categoria)}</td>`;

        // Columna 2: Primer tipo (con valorHora y valorMensual en líneas separadas)
        if (categoria.tipos[0]) {
          const valorHora = `$ ${categoria.tipos[0].valorHora.toLocaleString(
            "es-ES"
          )}`;
          const valorMensual = `$ ${categoria.tipos[0].valorMensual.toLocaleString(
            "es-ES"
          )}`;
          container += `<td>Hora:<br>${valorHora}<br>Mensual:<br>${valorMensual}</td>`;
        } else {
          container += "<td>-</td>";
        }

        // Columna 3: Segundo tipo (con valorHora y valorMensual en líneas separadas)
        if (categoria.tipos[1]) {
          const valorHora = `$ ${categoria.tipos[1].valorHora.toLocaleString(
            "es-ES"
          )}`;
          const valorMensual = `$ ${categoria.tipos[1].valorMensual.toLocaleString(
            "es-ES"
          )}`;
          container += `<td>Hora:<br>${valorHora}<br>Mensual:<br>${valorMensual}</td>`;
        } else {
          container += "<td>-</td>";
        }

        container += "</tr>";
      }

      container += "</tbody></table>";
      container += "</div>";

      // Añadir el contenedor al resultado en formato array
      result.push(container);
    }
  });

  return result;
};

function renderTablesComercio(data, fecha, rowsPerTable = 10) {
  let result = [];
  let currentTable = "";
  let currentRowCount = 0;
  
  // Función para formatear la fecha
  function formatDate(isoString) {
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'  // Forzar UTC para evitar ajustes por zona horaria
    });
    let formatted = formatter.format(date);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  
  function startNewTable() {
    return `
      <div>
        <p class="tableTitle">${formatDate(fecha)}</p>
        <table class="tableStyle">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Nivel</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
    `;
  }
  
  function closeTable() {
    return `
          </tbody>
        </table>
      </div>
    `;
  }
  
  currentTable = startNewTable();
  
  data.forEach(categoria => {
    categoria.subcategorías.forEach(subcategoria => {
      if (currentRowCount >= rowsPerTable) {
        currentTable += closeTable();
        result.push(currentTable);
        currentTable = startNewTable();
        currentRowCount = 0;
      }
      
      const row = `
        <tr>
          <td>${categoria.categoría}</td>
          <td>${subcategoria.nivel}</td>
          <td>$ ${subcategoria.importe.toLocaleString('es-AR')}</td>
        </tr>
      `;
      
      currentTable += row;
      currentRowCount++;
    });
  });
  
  if (currentRowCount > 0) {
    currentTable += closeTable();
    result.push(currentTable);
  }
  
  return result;
}
const example = [
  {
    fecha: "2024-08-01T12:00:00.000Z",
    categorias: [
      {
        categoria: 'SUPERVISOR',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 3160,
            valorMensual: 394234,
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3461,
            valorMensual: 439131,
          }
        ],
      },
      {
        categoria: 'PERSONAL PARA TAREAS ESPECÍFICAS',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2992,
            valorMensual: 366265,
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3280,
            valorMensual: 407715,
          }
        ],
      },
      {
        categoria: 'CASEROS',
        tipos: [
          {
            tipo: 'SIN RETIRO',
            valorHora: 2826,
            valorMensual: 357350,
          }
        ],
      },
      {
        categoria: 'ASISTENCIA Y CUIDADO DE PERSONAS',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2826,
            valorMensual: 357350,
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3160,
            valorMensual: 398229,
          }
        ],
      },
      {
        categoria: 'PERSONAL PARA TAREAS GENERALES',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2620,
            valorMensual: 321361,
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 2826,
            valorMensual: 357350,
          }
        ],
      }
    ],
    notificationDate: null,
    notifiedByTelegram: true,
    notifiedByWhatsApp: true,
    postIG: true
  },
  {
    fecha: "2024-07-01T12:00:00.000Z",
    categorias: [
      {
        categoria: 'SUPERVISOR',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 3038,
            valorMensual: 379071,
   
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3328,
            valorMensual: 422242,
   
          }
        ],
   
      },
      {
        categoria: 'PERSONAL PARA TAREAS ESPECÍFICAS',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2876,
            valorMensual: 352178,
   
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3154,
            valorMensual: 392034,
   
          }
        ],
   
      },
      {
        categoria: 'CASEROS',
        tipos: [
          {
            tipo: 'SIN RETIRO',
            valorHora: 2717,
            valorMensual: 343606,
   
          }
        ],
   
      },
      {
        categoria: 'ASISTENCIA Y CUIDADO DE PERSONAS',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2717,
            valorMensual: 343606,
   
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 3038,
            valorMensual: 382913,
   
          }
        ],
   
      },
      {
        categoria: 'PERSONAL PARA TAREAS GENERALES',
        tipos: [
          {
            tipo: 'CON RETIRO',
            valorHora: 2519,
            valorMensual: 309001,
   
          },
          {
            tipo: 'SIN RETIRO',
            valorHora: 2717,
            valorMensual: 343606,
   
          }
        ],
   
      }
    ],
    notificationDate: null,
    notifiedByTelegram: true,
    notifiedByWhatsApp: true,
    postIG: true
  }
];

module.exports = {
  renderTables,
  renderTablesComercio,
  example,
};
