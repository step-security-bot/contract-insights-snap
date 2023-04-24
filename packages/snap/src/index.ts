import { OnTransactionHandler } from '@metamask/snaps-types';
import { panel, heading, text } from '@metamask/snaps-ui';
import { hasProperty, isObject, Json } from '@metamask/utils';

export const onTransaction: OnTransactionHandler = async ({
  transactionOrigin,
  transaction,
  chainId,
}) => {
  interface litem {
    key0: string;
    key1: string;
    key2: string;
  }

  interface GraphQLResponse {
    data: {
      litems: litem[];
    };
  }

  interface Insight {
    value: string;
  }

  // For parsing out the domain
  function getDomainFromUrl(url: string): string | null {
    const match = url.match(/^https?:\/\/([^/?#]+)(?:[/?#]|$)/i);
    if (match) {
      return match[1];
    }
    return null;
  }

  //For address tags
  const query1 = ` 
      query {
        litems(where:{registry:"0x76944a2678a0954a610096ee78e8ceb8d46d5922", key1_contains_nocase: "${
          transaction.to as string
        }" ,status_in:[Registered], disputed:false})
      {
          itemID
          key0
          key1
          key2
          key3
          key4
        }
      }
    `;
  const domain = getDomainFromUrl(
    transactionOrigin ? transactionOrigin : 'NO_DOMAIN',
  );
  //For Ledger CDN registry
  const query2 = `
    query {
      litems(where:{registry:"0x957a53a994860be4750810131d9c876b2f52d6e1", key0_contains_nocase: "${chainId}:${
    transaction.to as string
  }" , key1: "${domain}", status_in:[Registered], disputed:false})
    {
        itemID
        key0
        key1
        key2

      }
    }
  `;

  async function fetchGraphQLData(query: string): Promise<GraphQLResponse> {
    const response = await fetch(
      'https://api.thegraph.com/subgraphs/name/greenlucid/legacy-curate-xdai',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query,
        }),
      },
    );

    const result = await response.json();
    return result;
  }

  async function getInsights(transaction: {
    [key: string]: Json;
  }): Promise<Insight[]> {
    const graphQLData1 = await fetchGraphQLData(query1);
    const litems1 = graphQLData1.data.litems;

    const graphQLData2 = await fetchGraphQLData(query2);
    const litems2 = graphQLData2.data.litems;

    const insights: Insight[] = [
      {
        value:
          '**Verified tag:** ' +
          (litems1.length > 0
            ? litems1[0].key0 + '(' + litems1[0].key2 + ')'
            : '_No tag found_'),
      },
      {
        value:
          '**Contract verified for this domain:** ' +
          (litems2.length > 0 ? 'Yes (' + domain + ')' : 'No'),
      },
    ];

    return insights;
  }

  const insights = await getInsights(transaction);

  return {
    content: panel([
      heading('Contract insights from Kleros'),
      ...insights.map((insight) => text(insight.value)),
    ]),
  };
};
