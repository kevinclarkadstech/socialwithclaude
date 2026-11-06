import type { Database, Transaction } from "../db";

/** The database or a transaction: anything a select can run on. */
export type Executor = Database | Transaction;
