# Atlas API 1: Sandbox Booking

Panduan integrasi Atlas Sandbox untuk search, verify, order, dan query order.

## 1. Sandbox

```text
Base URL: https://sandbox.atriptech.com/
Method: POST
Date format: YYYYMMDD
```

Contoh tanggal valid:

```text
20260915
```

Jangan gunakan format `YYYY-MM-DD`.

## 2. Authentication

Kirim header ini pada setiap request:

```http
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip
x-atlas-client-id: <SANDBOX_CLIENT_ID>
x-atlas-client-secret: <SANDBOX_CLIENT_SECRET>
```

Credentials lokal:

```dotenv
CLIENT_KEY=<sandbox-client-id>
SECRET_KEY=<sandbox-client-secret>
```

Jangan commit `.env`, mencetak secret ke log, atau mengirim credentials ke
frontend.

## 3. Identifier Flow

Simpan identifier berikut dan operasikan ke tahap berikutnya:

```text
search.do  -> routingIdentifier
verify.do  -> sessionId
order.do   -> orderNo, pnrCode
```

Lifetime menurut dokumentasi:

- `routingIdentifier`: maksimal 6 jam.
- `sessionId`: maksimal 2 jam.

## 4. Search

```http
POST https://sandbox.atriptech.com/search.do
```

Request:

```json
{
  "tripType": 1,
  "fromCity": "DUR",
  "toCity": "CPT",
  "fromDate": "20260915",
  "retDate": "",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "currency": "USD"
}
```

Rules:

- `tripType: 1` = one-way.
- `tripType: 2` = round-trip.
- `fromCity` dan `toCity` memakai kode IATA.
- `retDate` kosong untuk one-way.
- `currency: USD` diperlukan jika settlement currency belum dikonfigurasi.

Response sukses memakai `status: 0` dan routing tersedia di array `routings`:

```json
{
  "status": 0,
  "msg": null,
  "routings": [
    {
      "routingIdentifier": "<ROUTING_IDENTIFIER>",
      "currency": "USD",
      "adultPrice": 33.08,
      "adultTax": 28.05
    }
  ]
}
```

Test terverifikasi:

```text
Route: DUR -> CPT
Date: 20260915
HTTP: 200
API status: 0
Routes: 11
Example flight: FA171
Example total: USD 61.13
```

## 5. Verify

Memvalidasi harga dan ketersediaan sebelum order.

```http
POST https://sandbox.atriptech.com/verify.do
```

Request:

```json
{
  "routingIdentifier": "<ROUTING_IDENTIFIER>",
  "maxResponseTime": 15000
}
```

Response penting:

```json
{
  "sessionId": "<SESSION_ID>",
  "maxSeats": 9,
  "currency": "USD"
}
```

Gunakan `sessionId` dari response verify untuk order.

## 6. Order

Membuat order Sandbox. Jalankan hanya setelah verify sukses.

```http
POST https://sandbox.atriptech.com/order.do
```

Request minimal:

```json
{
  "sessionId": "<SESSION_ID>",
  "passengers": [
    {
   "name": "DOE/JOHN",
      "passengerType": 0,
      "gender": "M",
      "birthday": "19900101",
      "cardType": "PP",
      "cardNum": "A12345678",
      "cardIssuePlace": "US",
      "cardExpired": "20300101",
      "nationality": "US"
    }
  ],
  "contact": {
     "name": "DOE/JOHN",
    "email": "john.doe@example.com",
     "mobile": "0001-87291810"
  },
  "useAtlasMailForContact": false
}
```

Sesuaikan passenger fields dengan `bookingRequirement` dari response verify.

Nomor telepon harus memakai format `XXXX-XXXXXXXX`, contoh
`0001-87291810`.

Output UAT:

```text
orderNo
pnrCode / airline PNR
totalFare
currency
```

## 7. Query Order

```http
POST https://sandbox.atriptech.com/queryOrderDetails.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>"
}
```

Gunakan untuk membaca order status, ticket status, dan itinerary.

Status penting:

| Field | Nilai | Arti |
|---|---:|---|
| `orderStatus` | `1` | Order/payment sedang diproses |
| `orderStatus` | `2` | Order selesai/ticketed |
| `ticketStatus` | `0` | Belum terbit |
| `ticketStatus` | `1` | Ticket issued |

Polling diperlukan setelah `pay.do`; ticketing Sandbox dapat memerlukan lebih
dari satu request query.

## 8. Payment

```http
POST https://sandbox.atriptech.com/pay.do
```

Deposit/prepayment:

```json
{
  "orderNo": "<ORDER_NO>",
  "paymentMethod": 1
}
```

VCC:

```json
{
  "orderNo": "<ORDER_NO>",
  "paymentMethod": 3,
  "creditCard": {
    "cardHolderFirstName": "John",
    "cardHolderLastName": "Doe",
    "cardNumber": "4111111111111111",
    "cardExpireYear": "2030",
    "cardExpireMonth": "01",
    "cardCVV": "123",
    "cardType": "VI"
  }
}
```

`paymentMethod: 3` tanpa `creditCard` menghasilkan error
`creditCard is required`.

## 9. Price Compare Search

Gunakan untuk raw price discovery dan crawling. Endpoint ini membutuhkan
permission khusus pada akun.

```http
POST https://sandbox.atriptech.com/priceCompareSearch.do
```

Request:

```json
{
  "requestId": "crawl-dur-cpt-001",
  "tripType": "1",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "fromCity": "DUR",
  "toCity": "CPT",
  "fromDate": "20260915",
  "includeMultipleFareFamily": false,
  "currency": "USD"
}
```

Jika tidak ada hasil, endpoint dapat mengembalikan `noResultReason` dan
`recentFlightDates`, bila fitur aktif untuk akun.

Test terverifikasi dari workspace:

```text
HTTP: 200
API status: 900
Message: The current client is not allowed to access this API
```

Minta Atlas mengaktifkan permission Price Compare sebelum memakai endpoint ini.

## 10. Fulfilment

Flow alternatif jika offer sudah diketahui:

```text
getOffers.do
  -> getOfferPrice.do
  -> order.do
```

Search flight terlebih dahulu, lalu gunakan nomor penerbangan asli dari
`fromSegments[].flightNumber`. Atlas Sandbox menerima nomor tanpa prefix
carrier pada flow ini.

```http
POST https://sandbox.atriptech.com/getOfferPrice.do
```

Request terverifikasi:

```json
{
  "adults": 1,
  "childNum": 0,
  "infantNum": 0,
  "outboundSegments": [
    {
      "departureAirport": "DUR",
      "arrivalAirport": "CPT",
      "flightNumber": "171",
      "departureDate": "20260915",
      "carrier": "FA"
    }
  ],
  "currency": "USD"
}
```

`FA171` menghasilkan `status: 116`, sedangkan `171` menghasilkan offer.
Ambil `data[0].offer.offerID`, lalu kirim sebagai `offerId` ke `order.do`.

## 11. Ancillary

Seat dan baggage memerlukan context dari flow utama:

```text
verify.do / getOffers.do
  -> sessionId / offerId
  -> ancillary API
```

Informasi baggage juga dapat muncul pada `ancillaryProductElements` di
response verify.

## 12. Errors

### Status 900: authentication or permission

```text
The current API requires specific permissions, yet authentication information is missing for this request
```

Periksa Sandbox URL, header `x-atlas-*`, credentials, dan permission akun.

### Status 900: Price Compare permission

```text
The current client is not allowed to access this API, check account status and the api permissions
```

Minta permission khusus Price Compare.

### Status 102: trip type

```text
Trip type (tripType) can only be 1 (one-way) or 2 (round trip)
```

Gunakan angka `1` atau `2`, bukan `"OW"` atau `"RT"` pada `search.do`.

### Status 102: date

```text
Can not search past flights
```

Gunakan format `YYYYMMDD` dan tanggal yang masih future menurut waktu server
Atlas.

## 13. Verified UAT Flows

Semua flow berikut berhasil di Sandbox dengan `status: 0` dan ticket issued:

| Scenario | Order No | PNR | Total |
|---|---|---|---:|
| AMS -> MAA, 1 adult, one-way | `TESTA20260814161142264` | `XVNEDA` | USD 210.44 |
| DUR -> CPT, 2 adults + 1 child, round-trip | `TESTA20260814161142950` | `AYXBBU` | USD 310.44 |
| PUS -> CJU, VCC | `TESTA20260814162214435` | `QBVXAU` | USD 37.22 |
| BOM -> IXR, baggage in-booking | `TESTA20260814162304120` | `UGVYEF` | ancillary USD 292.44 |
| COK -> DXB, seat selection | `TESTA20260814162334779` | `XYYYAD` | ancillary USD 15.23 |
| DUR -> CPT, fulfilment | `TESTA20260814164025196` | `BNSPV1` | USD 61.13 |

Order `TESTA20260814162214435` kemudian diproses dengan void. Jangan gunakan
order tersebut sebagai order aktif.

## 14. Production

Jangan gunakan production sebelum Sandbox dan UAT lulus.

```text
Production search: https://search-sg.atriptech.com/
Production others: https://api-sg.atriptech.com/
```

Production memerlukan credentials LIVE dan base URL production dari ATRIP.
