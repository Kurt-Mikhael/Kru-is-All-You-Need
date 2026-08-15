# Atlas API Sandbox

Dokumen ini menjadi acuan integrasi Atlas Sandbox untuk proyek ini.

## Environment

Gunakan Sandbox untuk development dan testing.

```text
Sandbox base URL: https://sandbox.atriptech.com/
```

Semua endpoint Sandbox menggunakan base URL yang sama, termasuk search, verify,
order, payment, fulfilment, balance, dan query.

Jangan gunakan endpoint production dengan credentials Sandbox:

```text
Production search: https://search-sg.atriptech.com/
Production others: https://api-sg.atriptech.com/
```

## Credentials

Credentials disimpan lokal di `.env`:

```dotenv
CLIENT_KEY=<sandbox-client-id>
SECRET_KEY=<sandbox-client-secret>
```

Jangan commit `.env`, mencetak secret ke log, atau mengirim secret ke frontend.

## Sandbox Authentication

Sandbox tidak memakai MD5 signature.

Required headers:

```http
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip
x-atlas-client-id: <SANDBOX_CLIENT_ID>
x-atlas-client-secret: <SANDBOX_CLIENT_SECRET>
```

Catatan:

- Jangan menambahkan `client_id`, `timestamp`, atau `signature` untuk Sandbox.
- `Content-Encoding: gzip` tidak diperlukan untuk request JSON biasa.
- `Accept-Encoding: gzip` hanya meminta server mengompresi response bila didukung.

## Flight Search

Endpoint:

```http
POST https://sandbox.atriptech.com/search.do
```

Request body:

```json
{
  "tripType": 1,
  "fromCity": "CGK",
  "toCity": "SIN",
  "fromDate": "20260915",
  "retDate": "",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "currency": "USD"
}
```

Field rules:

| Field         | Rule                                                                |
| ------------- | ------------------------------------------------------------------- |
| `tripType`  | `1` one-way, `2` round-trip. Bukan `"OW"` atau `"RT"`. |
| `fromCity`  | IATA origin, contoh `CGK`. |
| `toCity`    | IATA destination, contoh `SIN`. |
| `fromDate`  | Format `YYYYMMDD`; gunakan tanggal masa depan. |
| `retDate`   | Kosong untuk one-way; isi tanggal pulang untuk round-trip.          |
| `adultNum`  | Jumlah penumpang dewasa.                                            |
| `childNum`  | Jumlah anak.                                                        |
| `infantNum` | Jumlah bayi.                                                        |
| `currency`  | Gunakan`USD` di Sandbox sampai settlement currency dikonfigurasi. |

## cURL Test

PowerShell:

```powershell
$body = @'
{
  "tripType": 1,
  "fromCity": "CGK",
  "toCity": "SIN",
  "fromDate": "20260915",
  "retDate": "",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "currency": "USD"
}
'@

curl.exe -X POST "https://sandbox.atriptech.com/search.do" `
  -H "Content-Type: application/json" `
  -H "Accept: application/json" `
  -H "Accept-Encoding: gzip" `
  -H "x-atlas-client-id: $env:CLIENT_KEY" `
  -H "x-atlas-client-secret: $env:SECRET_KEY" `
  --data-raw $body
```

Jika `.env` belum dimuat ke environment shell, gunakan Postman atau load
variables secara lokal tanpa mencetak nilainya.

## Response

Success secara API ditandai `status: 0`, bukan hanya HTTP `200`.

```json
{
  "routings": [],
  "status": 0,
  "msg": null,
  "requestId": null,
  "clientRequestId": null
}
```

`status: 0` dengan `routings: []` berarti request valid tetapi Sandbox tidak
menemukan penerbangan untuk query tersebut.

Simpan `routingIdentifier` dari routing jika response mengembalikan hasil:

```text
Search -> routingIdentifier
Verify -> sessionId
Order -> orderNo
```

Jika memakai Get Offer atau Fulfilment API, simpan `OfferId` sebagai pengganti
`sessionId` sesuai flow Atlas.

## Known Errors

### Status 900

```text
The current API requires specific permissions, yet authentication information is missing for this request
```

- Memakai production URL dengan Sandbox credentials.
- Header `x-atlas-client-id` atau `x-atlas-client-secret` salah nama.
- Credentials tidak memiliki permission endpoint.
- Secret/client ID tertukar atau kosong.

### Status 102: trip type

```text
Trip type (tripType) can only be 1 (one-way) or 2 (round trip)
```

Gunakan angka `1` atau `2`, bukan string `"OW"`.

### Status 102: tanggal

```text
Can not search past flights
```

Gunakan tanggal yang pasti masih di masa depan menurut waktu server Atlas.

## Integration Flow

```text
Search
  -> routingIdentifier
Verify
  -> sessionId
Order
  -> orderNo
Payment / Fulfilment
Order Query
Ticketing
Webhook
```

Untuk MVP proyek, adapter internal harus menyembunyikan schema Atlas:

```text
FlightService
  |
AtlasAdapter
  |
Atlas Sandbox API
  |
NormalizedFlightCandidate
```

Atlas-specific payload tidak boleh bocor ke scenario engine atau frontend.

## UAT Reference Routes

Sandbox mock inventory yang terverifikasi:

| Module | Route | Type |
|---|---|---|
| Flight Booking | `AMS -> MAA` | 1 adult, one-way, connection |
| Flight Booking | `DUR -> CPT` | 2 adults + 1 child, round-trip |
| VCC | `PUS -> CJU` | 1 adult, one-way |
| Baggage | `BOM -> IXR` | In-booking ancillary |
| Seat | `COK -> DXB` | Seat ancillary |
| Post-ticketing baggage | `ELQ -> HMB` | Connecting, ancillary order type 6 |

Gunakan route hasil response Search, bukan flight number atau product code yang
diketik manual. Untuk `getOfferPrice.do`, Sandbox menerima flight number tanpa
prefix carrier, contoh `171` bukan `FA171`.

## UAT Status Rules

UAT booking checks biasanya membutuhkan:

```text
orderStatus: 2
ticketStatus: 1
```

Payment sukses (`status: 0`) belum berarti tiket sudah terbit. Poll
`queryOrderDetails.do` sampai kedua status tersebut terpenuhi.

Post-ticketing baggage membutuhkan:

```text
orderType: 6
ancillary baggage present
main order linked and ticketed
```

Untuk connecting baggage, kirim product code sama pada setiap segment yang
diminta response ancillary search. Response `status: 0` pada search tidak
menjamin order ancillary diterima maskapai.

## Production Transition

Production hanya dipakai setelah:

1. Sandbox flow stabil.
2. UAT selesai dan disetujui.
3. Account diubah ke `LIVE` oleh Atlas.
4. Production credentials dibuat.
5. Search dan transaction base URL diganti sesuai ATRIP.
6. Controlled smoke test berhasil.

## Verified Test

Test Search yang berhasil dari workspace:

```text
POST https://sandbox.atriptech.com/search.do
Auth: x-atlas-client-id / x-atlas-client-secret
Payload: DUR -> CPT, tripType=1, fromDate=20260915, currency=USD
Result: HTTP 200, status=0, routes=11
```

`tripType: "OW"` menghasilkan status `102`. Format tanggal `YYYY-MM-DD`
tidak boleh digunakan; gunakan `YYYYMMDD`.

## Payment

```http
POST https://sandbox.atriptech.com/pay.do
```

Deposit:

```json
{ "orderNo": "<ORDER_NO>", "paymentMethod": 1 }
```

VCC memakai `paymentMethod: 3` dan wajib mengirim object `creditCard` dengan
field `cardHolderFirstName`, `cardHolderLastName`, `cardNumber`,
`cardExpireYear`, `cardExpireMonth`, `cardCVV`, dan `cardType`.

## Verified UAT Summary

Verified Sandbox results:

```text
Search -> Verify -> Order -> Pay -> Query
status: 0
orderStatus: 2
ticketStatus: 1
```

Verified ancillary post-ticketing:

```text
Main order: TESTA20260814162854980
Ancillary order: TESTB20260814164508794
orderType: 6
ticketStatus: 1
```

Connecting ancillary dapat membutuhkan product code sama pada seluruh segment.
