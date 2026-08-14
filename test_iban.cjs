async function test() {
  try {
    const res = await fetch('https://api.api-ninjas.com/v1/iban?iban=FR1420041010050500013M02606', {
      headers: { 'X-Api-Key': 'MJAkRnw2lK8ZzVc2GsfWo0ZbtDmiB0MpTavKLd39' }
    });
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
test();
