/**
 * Produção: o Angular compilado é servido pela própria API, então a mesma
 * origem atende front e back. Caminho relativo funciona em qualquer
 * domínio — antes isto apontava para https://localhost:7288, que em
 * produção é o computador do visitante, não o servidor.
 */
export const environment = {
  production: true,
  apiUrl: '/api'
};
