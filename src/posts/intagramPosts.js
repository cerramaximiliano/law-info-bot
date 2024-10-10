const newFeesPosts = (array) => {
  const boxes = array
    .map(
      (item) => `
        <div class="box">
          <p class="price">${item.monto}</p>
          <p class="date">${item.periodo}</p>
        </div>
      `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UMA Ley 27.423</title>
    <style>
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
        border-radius: 12px;
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
        border-radius: 12px 12px 0 0;
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
      }
    </style>
  </head>
  <body>
    <div class="container" id="postContainer">
      <div class="header">
        <h1>UMA</h1>
        <p class="subheader">Ley N° 27.423</p>
      </div>
      <div class="content">
        ${boxes}
      </div>
    </div>
  </body>
</html>
`;
};


module.exports = { newFeesPosts };
