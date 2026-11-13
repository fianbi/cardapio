import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidade" };

const h2 = "mt-6 text-lg font-semibold";

export default function Privacy() {
  const { appName, company, contactEmail, updatedAt } = LEGAL;
  return (
    <article className="mx-auto max-w-2xl space-y-3 text-sm leading-relaxed text-stone-700">
      <h1 className="text-2xl font-bold text-stone-900">Política de privacidade</h1>
      <p className="text-stone-500">Última atualização: {updatedAt}</p>
      <p>
        Esta política explica quais dados o {appName}, operado por {company}, coleta e como eles são usados, de acordo
        com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <h2 className={h2}>1. Dados que coletamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Conta:</strong> nome, e-mail e foto de perfil informados pelo Google ou pela Apple quando você entra.
        </li>
        <li>
          <strong>Pedidos:</strong> telefone, endereços de entrega, itens pedidos, observações e forma de pagamento
          escolhida.
        </li>
        <li>
          <strong>Aparelho:</strong> identificador para envio de notificações sobre o andamento do pedido, se você
          permitir.
        </li>
      </ul>
      <p>Não coletamos dados de cartão: o pagamento é feito diretamente ao estabelecimento.</p>

      <h2 className={h2}>2. Como usamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Para enviar seu pedido ao estabelecimento e permitir a entrega.</li>
        <li>Para avisar você sobre o andamento do pedido.</li>
        <li>Para preencher seus dados nos próximos pedidos e mostrar seu histórico.</li>
        <li>Para prevenir fraudes e melhorar o serviço, com dados agregados.</li>
      </ul>

      <h2 className={h2}>3. Com quem compartilhamos</h2>
      <p>
        O estabelecimento que recebe o pedido vê seu nome, telefone, endereço de entrega e os itens. Usamos fornecedores
        de infraestrutura (hospedagem, banco de dados e envio de notificações) que tratam os dados apenas para operar o
        serviço. Não vendemos seus dados.
      </p>

      <h2 className={h2}>4. Por quanto tempo guardamos</h2>
      <p>
        Os dados da conta ficam guardados enquanto ela existir. Ao excluir a conta, seus dados pessoais são apagados e os
        pedidos antigos ficam apenas como registro da loja, sem ligação com você.
      </p>

      <h2 className={h2} id="excluir-conta">
        5. Seus direitos e exclusão da conta
      </h2>
      <p>
        Você pode consultar, corrigir e excluir seus dados. Para excluir a conta, abra o aplicativo, vá em{" "}
        <strong>Perfil</strong> e toque em <strong>Excluir minha conta</strong>. Se preferir, escreva para {contactEmail}{" "}
        a partir do e-mail da conta e faremos a exclusão em até 15 dias.
      </p>

      <h2 className={h2}>6. Contato</h2>
      <p>Dúvidas sobre privacidade ou pedidos relacionados aos seus dados: {contactEmail}.</p>
    </article>
  );
}
