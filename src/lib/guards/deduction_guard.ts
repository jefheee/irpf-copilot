import { MAX_DEDUCTION_EDUCATION } from '../constants/tax_limits';

export interface DespesaExtraction {
  tipo_despesa: string;
  valor_bruto: number;
  dependentes_envolvidos: number;
}

/**
 * Função pura e determinística em TypeScript para calcular travas limitadoras fiscais.
 * @param data O objeto JSON mastigado pelo LLM.
 * @returns O valor matemático seguro e devidamente encurralado na lei.
 */
export function applyEducationDeductionGuard(data: DespesaExtraction): {
  calculado: number;
  justificativa: string;
} {
  // Limite global para o grupo de dependentes analisado
  const limit = MAX_DEDUCTION_EDUCATION * Math.max(1, data.dependentes_envolvidos);
  
  // A dedução será o menor valor entre o total gasto e o limite legal
  const deducted = Math.min(data.valor_bruto, limit);

  return {
    calculado: deducted,
    justificativa: `O valor bruto submetido foi R$ ${data.valor_bruto.toFixed(2)}. Aplicado o limite legal R$ ${MAX_DEDUCTION_EDUCATION.toFixed(2)} vezes ${data.dependentes_envolvidos} dependente(s) = R$ ${limit.toFixed(2)}. Fica dedutível R$ ${deducted.toFixed(2)}.`
  };
}
