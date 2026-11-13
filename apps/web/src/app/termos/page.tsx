import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Termos de uso" };

const h2 = "mt-6 text-lg font-semibold";

export default function Terms() {
  const { appName, company, contactEmail, updatedAt } = LEGAL;
  return (
    <article className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-stone-700">
      <h1 className="text-2xl font-bold text-stone-900">Termos de uso</h1>
      <p className="text-stone-500">Última atualização: {updatedAt}</p>

      <h2 className={h2}>1. O que é o {appName}</h2>
      <p>
        O {appName}, operado por {company}, reúne os cardápios de lanchonetes e restaurantes da cidade e permite que você
        faça pedidos diretamente para cada estabelecimento. O {appName} é um intermediário de tecnologia: os produtos são
        preparados, vendidos e entregues pelo estabelecimento escolhido.
      </p>

      <h2 className={h2}>2. Conta</h2>
      <p>
        Para pedir, você entra com sua conta Google ou Apple. Você é responsável pelas informações que fornece (nome,
        telefone e endereço) e por mantê-las corretas para que o pedido chegue até você.
      </p>

      <h2 className={h2}>3. Pedidos e pagamento</h2>
      <p>
        O pedido só é confirmado quando o estabelecimento aceita. O estabelecimento pode recusar ou cancelar um pedido,
        informando o motivo. Os preços, a taxa de entrega e o tempo estimado são definidos pelo estabelecimento. O
        pagamento é feito diretamente ao estabelecimento, na entrega ou na retirada; o {appName} não recebe nem guarda
        dados de cartão.
      </p>

      <h2 className={h2}>4. Responsabilidades</h2>
      <p>
        A qualidade dos produtos, as informações do cardápio (inclusive ingredientes e alergênicos), o preparo e a entrega
        são de responsabilidade do estabelecimento. Problemas com um pedido devem ser tratados primeiro com o
        estabelecimento; se não houver solução, fale conosco pelo e-mail abaixo.
      </p>

      <h2 className={h2}>5. Estabelecimentos</h2>
      <p>
        O cadastro de estabelecimentos passa por aprovação. O estabelecimento se compromete a manter cardápio, preços e
        horários atualizados e a cumprir as normas sanitárias e fiscais aplicáveis. Podemos suspender lojas que
        descumpram estes termos.
      </p>

      <h2 className={h2}>6. Uso adequado</h2>
      <p>
        Não é permitido fazer pedidos falsos, usar dados de terceiros sem autorização ou tentar prejudicar o
        funcionamento do serviço. Contas usadas dessa forma podem ser bloqueadas.
      </p>

      <h2 className={h2}>7. Alterações e contato</h2>
      <p>
        Estes termos podem ser atualizados; a data no topo indica a versão em vigor. Dúvidas: {contactEmail}.
      </p>
    </article>
  );
}
