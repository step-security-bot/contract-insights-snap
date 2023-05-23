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

  console.log(JSON.stringify(transaction));

  //All 3 queries below have a hardcoded registry, as only one contract is used for each data type for contracts on all chains.
  //1. For querying Address Tags
  const query1 = ` 
    query {
      litems(where:{registry:"0xa64e8949ad24259526a32d4bfd53a9f2154ae6bb", key0_contains_nocase: "${chainId}:${
    transaction.to as string
  }" , status_in:[Registered], disputed:false})
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

  //2. For querying Contract Domain Name entries
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

  //3. For querying if the contract is a Token contract
  const query3 = `
    query {
      litems(where:{registry:"0x3d0ab3323fe71954e81897f29bd257e47b12b923", key0_contains_nocase: "${chainId}:${
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

    const graphQLData3 = await fetchGraphQLData(query3);
    const litems3 = graphQLData3.data.litems;

    const insights: Insight[] = [
      //retrieving on the first address tag, assuming that the TCR ensures there will not be more than one valid tag per contract
      {
        value:
          '**Project Name:** ' +
          (litems1.length > 0 ? litems1[0].key1 : '_Not found_'),
      },
      {
        value:
          '**Contract Tag:** ' +
          (litems1.length > 0
            ? litems1[0].key2 +
              (litems1[0].key3 ? '(' + litems1[0].key3 + ')' : '')
            : '_Not found_'),
      },
      {
        value:
          '**Contract verified for this domain:** ' +
          (litems2.length > 0 ? 'Yes (' + domain + ')' : 'No'),
      },
    ];

    //As the minority of contracts are not tokens, only adding this entry if the query3 has a positive result from the tokens registry.
    //Right now, it doesn't show this line at all if a token is not verified. Maybe we can improve it to distinguish between token and non-token contracts (function signatures maybe?)
    if (litems3.length > 0) {
      insights.push({
        value:
          '**Token contract details:** ' + litems3[0] + ' (' + litems3[2] + ')',
      });
    }

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
