// File: frontend/src/App.test.jsx
// Description: Prueba básica del componente principal <App /> usando
//              React Testing Library. Verifica que la aplicación renderice
//              un texto específico presente en la interfaz (por ejemplo,
//              un título o botón principal de la página de inicio).

import { render, screen } from '@testing-library/react'; // Importa funciones para renderizar componentes y consultar el DOM de prueba
import App from '../App';                                 // Importa el componente principal de la aplicación ProCivil Manager

// Define un caso de prueba (test unitario) para el componente <App />
test('renderiza el texto principal de la aplicación', () => {
  render(<App />);                                       // Renderiza el componente <App /> en un DOM virtual (no en el navegador real)

  // 🔎 NOTA:
  // El texto buscado debe existir realmente en la interfaz que se renderiza por defecto.
  // Actualmente usamos /procivil manager/i, por lo que en la HomePage o en algún
  // componente que se muestre en la ruta "/" debe aparecer ese texto (por ejemplo,
  // un título <h1>ProCivil Manager</h1> o un botón con ese label).
  //
  // Si en el futuro cambias el copy principal (por ejemplo a "Bienvenido a ProCivil Manager"),
  // deberás ajustar la expresión regular de abajo para que coincida con el nuevo texto.
  const element = screen.getByText(/procivil manager/i); // Busca un nodo que contenga el texto "procivil manager" (ignorando mayúsculas/minúsculas)

  expect(element).toBeInTheDocument();                   // Verifica que el elemento encontrado exista en el documento de prueba
});
