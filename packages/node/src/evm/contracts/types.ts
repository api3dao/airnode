// TODO: Can't find the ethers.js type for ABIs
export type ABI = string[] | any;

export interface Contract {
  readonly ABI: ABI;
  readonly topics: { readonly [key: string]: string };
}
