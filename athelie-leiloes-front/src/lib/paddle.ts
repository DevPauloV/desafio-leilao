export const paddleNumber = (pseudonym: string) => {
  const hash = pseudonym.indexOf('#');
  return hash >= 0 ? pseudonym.slice(hash) : pseudonym;
};
