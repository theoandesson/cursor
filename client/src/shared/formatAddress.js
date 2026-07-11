export const formatAddress = (address) => {
  if (!address) {
    return "";
  }

  if (typeof address === "string") {
    return address;
  }

  const street = [address.road, address.house_number].filter(Boolean).join(" ");
  const locality = address.city ?? address.town ?? address.village ?? address.suburb;
  return [street, [address.postcode, locality].filter(Boolean).join(" "), address.country]
    .filter(Boolean)
    .join(", ");
};
