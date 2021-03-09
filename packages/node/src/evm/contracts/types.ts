// TODO: Can't find the ethers.js type for ABIs
export type ABI = string[] | any;

export interface Contract {
  ABI: ABI;
  topics: { [key: string]: string };
}
