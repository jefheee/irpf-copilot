import * as cheerio from 'cheerio';

/**
 * Lê uma string contendo HTML de normativas públicas, remove os nós revogados e retorna texto plano higienizado.
 * Fundamental para prever armadilhas na base do RAG onde o PGVector ingere acidentalmente texto rasurado no Planalto.
 * 
 * @param htmlContent HTML cru devidamente scrapeado ou importado de normativas (Planalto, Receita Federal)
 * @returns String contendo o texto expurgado.
 */
export function sanitizeOfficialLaws(htmlContent: string): string {
  const $ = cheerio.load(htmlContent);

  // Seletores para remoção absoluta de conteúdo revogado pela técnica HTML5 / HTML4 / Inline CSS.
  const removalSelectors = [
    'strike',
    's',
    'del',
    '[style*="text-decoration: line-through"]',
    '[style*="text-decoration:line-through"]',
    '.revogado',
    'font[color="red"]',
    '[style*="color: red"]',
    '[style*="color:red"]'
  ].join(', ');

  // Destrói ativamente os elementos do Virtual DOM
  $(removalSelectors).remove();

  // Devolve o stringão bruto limpo de espaços extras
  return $.text().replace(/\s+/g, ' ').trim();
}
