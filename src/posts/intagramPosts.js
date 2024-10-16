const newFeesPosts = (array, designStyle, title) => {
  let styles = "";
  const boxes = array
    .map(
      (item) => `
      <div class="box">
        <p class="price">$ ${item.monto}</p>
        <p class="date">${item.periodo}</p>
      </div>
    `
    )
    .join("");

  switch (designStyle) {
    case "1":
      styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: "Poppins", sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 0;
    background-color: #f0f2f5; /* Fondo más claro y limpio */
  }
  
  .container {
    width: 1080px;
    height: 1080px;
    background-color: white;
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.1); /* Sombra más suave */
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.3s ease;
    border-radius: 20px; /* Bordes más redondeados */
    padding: 20px;
  }
  
  .container:hover {
    transform: translateY(-8px); /* Hover más sutil */
  }
  
  .header {
    background-color: #34495e; /* Ajuste del color de fondo */
    color: white;
    padding: 30px; /* Más espacio */
    border-radius: 15px; /* Bordes redondeados */
    height: 35%;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); /* Sombra más pronunciada */
  }
  
  h1 {
    font-size: 9rem; /* Tamaño ajustado */
    margin-bottom: 15px;
    font-weight: 700;
  }
  
  .subheader {
    font-size: 3.5rem; /* Tamaño ajustado para mejor legibilidad */
    color: #b0c4de; /* Ajuste del color */
  }
  
  .content {
    display: flex;
    justify-content: space-around;
    margin-top: 30px; /* Mejor espaciado */
    flex-grow: 1;
  }
  
  .box {
    background-color: #f8f9fb; /* Fondo más claro */
    width: 45%;
    padding: 20px; /* Más padding */
    border: 1px solid #dde5ee;
    border-radius: 15px; /* Bordes más redondeados */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); /* Sombra más sutil */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-self: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease; /* Efecto de hover */
  }
  
  .box:hover {
    transform: translateY(-5px); /* Hover para la caja */
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); /* Efecto hover más notorio */
  }
  
  .price {
    font-size: 6.5rem; /* Ajustado para mejor proporción */
    color: #2c3e50; /* Ajuste de color */
    margin-bottom: 10px; /* Espaciado mejorado */
    font-weight: bold;
  }
  
  .date {
    font-size: 3rem; /* Ajustado para mejor proporción */
    color: #7f8c8d; /* Color más neutro */
  }
  
  @media (max-width: 1080px) {
    .container {
      width: 90vw;
      height: 90vw;
      padding: 15px;
    }
    
    h1 {
      font-size: 5.5rem;
    }
    
    .subheader {
      font-size: 2rem;
    }
    
    .price {
      font-size: 4rem;
    }
    
    .date {
      font-size: 1.5rem;
    }
    
    .content {
      flex-direction: column;
      align-items: center;
    }
    
    .box {
      width: 80%;
      margin-bottom: 25px;
    }
  }
`;

      break;
    case "2":
      styles = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: "Poppins", sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0;
        background-color: #f8f9fa; /* Fondo suave */
      }

      .container {
        width: 1080px;
        height: 1080px;
        background-color: #0c1922;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15); /* Sombra más profunda */
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 25px;
        position: relative;
        overflow: hidden;
      }

      /* Borde superior izquierdo (horizontal y vertical) */
      .border-top-left {
        position: absolute;
        top: 0;
        left: 0;
        width: 50%;
        height: 20px;
        background-color: #1b2a41; /* Color para el borde superior izquierdo */
      }

      .border-left-top {
        position: absolute;
        top: 0;
        left: 0;
        width: 20px;
        height: 50%;
        background-color: #1b2a41; /* Color para el borde vertical izquierdo */
      }

      /* Borde superior derecho (horizontal y vertical) */
      .border-top-right {
        position: absolute;
        top: 0;
        right: 0;
        width: 50%;
        height: 20px;
        background-color: #bfbcd0; /* Color para el borde superior derecho */
      }

      .border-right-top {
        position: absolute;
        top: 0;
        right: 0;
        width: 20px;
        height: 50%;
        background-color: #bfbcd0; /* Color para el borde vertical derecho */
      }

      /* Borde inferior izquierdo (horizontal y vertical) */
      .border-bottom-left {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 50%;
        height: 20px;
        background-color: #bfbcd0; /* Color para el borde inferior izquierdo */
      }

      .border-left-bottom {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 20px;
        height: 50%;
        background-color: #bfbcd0; /* Color para el borde vertical izquierdo */
      }

      /* Borde inferior derecho (horizontal y vertical) */
      .border-bottom-right {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 50%;
        height: 20px;
        background-color: #1b2a41; /* Color para el borde inferior derecho */
      }

      .border-right-bottom {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 50%;
        background-color: #1b2a41; /* Color para el borde vertical derecho */
      }

      .header {
        background-color: #0c1922;
        color: white;
        padding: 30px;
        height: 35%;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        position: relative;
      }

      h1 {
        font-size: 9rem;
        margin-bottom: 15px;
        font-weight: 700;
      }

      .subheader {
        font-size: 3.5rem;
        color: #b0c4de;
        position: relative;
        text-align: center;
      }

      .divider {
        margin: auto;
        margin-top: 8px;
        align-items: center;
        width: 50%;
        height: 3.5px; /* Línea más gruesa */
        background-color: #a2b9cf;
      }

      .content {
        display: flex;
        justify-content: space-around;
        align-items: center;
        margin-top: 30px;
        flex-grow: 1;
      }

      .box {
        max-height: fit-content;
        background-color: #314a60;
        width: 45%;
        padding: 25px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .price {
        font-size: 6.5rem;
        color: #ffff;
        margin-bottom: 10px;
        font-weight: bold;
        position: relative;
      }

      .date {
        font-size: 3rem;
        color: #7f8c8d;
        margin-top: 15px;
      }
      .logo {
        color: white;
        font-family: "Cinzel", serif;
        font-optical-sizing: auto;
        font-weight: <weight>;
        font-style: normal;
        font-size: 53px;
        margin-bottom: 80px;
      }

      @media (max-width: 1080px) {
        .container {
          width: 90vw;
          height: 90vw;
          padding: 15px;
        }

        h1 {
          font-size: 5.5rem;
        }

        .subheader {
          font-size: 2rem;
        }

        .price {
          font-size: 4rem;
        }

        .date {
          font-size: 1.5rem;
        }

        .content {
          flex-direction: column;
          align-items: center;
        }

        .box {
          width: 80%;
          margin-bottom: 25px;
        }
      }
      `;
      break;

    default:
      styles = `
      * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      }
      
      body {
      font-family: "Poppins", sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0;
      }
      
      .container {
      width: 1080px;
      height: 1080px;
      background-color: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: transform 0.3s ease;
      }
      
      .container:hover {
      transform: translateY(-10px);
      }
      
      .header {
      background-color: #2d3e50;
      color: white;
      padding: 20px;
      height: 35%;
      }
      
      h1 {
      font-size: 10rem;
      margin-bottom: 10px;
      font-weight: 700;
      }
      
      .subheader {
      font-size: 4rem;
      color: #a2b9cf;
      }
      
      .content {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      flex-grow: 1;
      }
      
      .box {
      margin: auto;
      background-color: #f4f7fc;
      width: 45%;
      height: 50%;
      padding: 10px;
      border: 1px solid #dde5ee;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      align-self: center;
      }
      
      .price {
      font-size: 7rem;
      color: #2d3e50;
      margin-bottom: 5px;
      font-weight: bold;
      }
      
      .date {
      font-size: 3.5rem;
      color: #7c8a98;
      }
      
      @media (max-width: 1080px) {
      .container {
      width: 90vw;
      height: 90vw;
      }
      
      h1 {
      font-size: 5rem;
      }
      
      .subheader {
      font-size: 1.8rem;
      }
      
      .subheader.small {
      font-size: 1.4rem;
      }
      
      .price {
      font-size: 4rem;
      }
      
      .date {
      font-size: 1.2rem;
      }
      
      .content {
      flex-direction: column;
      align-items: center;
      }
      
      .box {
      width: 80%;
      margin-bottom: 20px;
      }
      }`;
  }

  return `
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap"
      rel="stylesheet"
    />
      <style>
        ${styles}
      </style>
    </head>
  <body>
    <div class="container" id="postContainer">
      <!-- Borde superior izquierdo -->
      <div class="border-top-left"></div>
      <div class="border-left-top"></div>

      <!-- Borde superior derecho -->
      <div class="border-top-right"></div>
      <div class="border-right-top"></div>

      <!-- Borde inferior izquierdo -->
      <div class="border-bottom-left"></div>
      <div class="border-left-bottom"></div>

      <!-- Borde inferior derecho -->
      <div class="border-bottom-right"></div>
      <div class="border-right-bottom"></div>

      <div class="header">
        <h1>${title[0]}</h1>
        <p class="subheader">${title[1]}</p>
        <div class="divider"></div>
      </div>
      <div class="content">
        ${boxes}
      </div>
       <div>
        <p class="logo">Law||Analytics</p>
      </div>
    </div>
  </body>
    </html>
  `;
};

module.exports = { newFeesPosts };
