# Atlas API 2: Ancillary, Void, Refund, Webhook

Dokumen integrasi fitur post-booking Atlas Sandbox.

## 1. Sandbox Authentication

```text
Base URL: https://sandbox.atriptech.com/
Method: POST
Date format: YYYYMMDD jika endpoint membutuhkannya
```

Required headers:

```http
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip
x-atlas-client-id: <SANDBOX_CLIENT_ID>
x-atlas-client-secret: <SANDBOX_CLIENT_SECRET>
```

Jangan commit credentials atau mengirimkannya ke frontend.

## 2. Post-Ticketing Baggage

Fitur ini digunakan setelah tiket sudah `ticketed`.

Rules:

- Tidak tersedia dalam 24 jam sebelum keberangkatan.
- Tidak berlaku untuk penumpang infant.
- Pembelian membutuhkan `ticketOrderNo` dan data passenger yang sesuai order.

### 2.1 Search Baggage

```http
POST https://sandbox.atriptech.com/postBookingAncillarySearch.do
```

Request:

```json
{
  "ticketOrderNo": "<TICKET_ORDER_NO>",
  "ancillaryCategory": "BAGGAGE"
}
```

Ambil dari response:

```text
sessionId
ancillaryProductElements[].productCode
```

Contoh product code:

```text
SCI_BAG_1PC_20KG
```

### 2.2 Order Baggage

```http
POST https://sandbox.atriptech.com/postBookingAncillaryOrder.do
```

Request:

```json
{
  "sessionId": "<SESSION_ID>",
  "ancillaryCategory": "BAGGAGE",
  "ticketOrderNo": "<TICKET_ORDER_NO>",
  "passengers": [
    {
      "name": "DOE/JOHN",
      "passengerType": 0,
      "ancillaries": [
        {
          "productCode": "SCI_BAG_1PC_20KG",
          "segmentIndex": 1
        }
      ]
    }
  ]
}
```

Response menghasilkan `orderNo` baru untuk transaksi ancillary.

Untuk connecting flight, Atlas dapat mewajibkan satu ancillary dengan product
code sama untuk setiap segment. Contoh payload yang berhasil membuat order:

```json
{
  "sessionId": "<SESSION_ID>",
  "ancillaryCategory": "BAGGAGE",
  "ticketOrderNo": "<MAIN_ORDER_NO>",
  "passengers": [
    {
      "name": "DOE/JOHN",
      "passengerType": 0,
      "ancillaries": [
        { "productCode": "SCI_BAG_3PC_15KG", "segmentIndex": 1 },
        { "productCode": "SCI_BAG_3PC_15KG", "segmentIndex": 2 }
      ]
    }
  ]
}
```

Order ancillary yang berhasil memiliki `orderType: 6` dan harus dibayar serta
ditunggu sampai ticketed sebelum dikirim ke UAT.

## 3. Void dan Refund

Atlas membedakan:

- **Void**: pembatalan pada hari yang sama dengan penerbitan tiket.
- **Refund**: pembatalan standar sesuai kebijakan maskapai.

Keduanya berlaku untuk full order, bukan sebagian passenger.

### 3.1 Void Quotation

```http
POST https://sandbox.atriptech.com/voidQuotation.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>"
}
```

Ambil `voidOfferId`, `isVoidable`, dan `voidWindow.sameDayDeadlineTime`.

### 3.2 Refund Quotation

```http
POST https://sandbox.atriptech.com/refundQuotation.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>"
}
```

Ambil `refundOfferId` dan `isRefundable`.

Jika `voidWindow.sameDayDeadlineTime` sudah lewat, gunakan refund flow.

### 3.3 Execute Void

```http
POST https://sandbox.atriptech.com/void.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>",
  "voidOfferId": "<VOID_OFFER_ID>"
}
```

Ambil `voidCode` dari response.

### 3.4 Execute Refund

```http
POST https://sandbox.atriptech.com/refund.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>",
  "refundOfferId": "<REFUND_OFFER_ID>"
}
```

Ambil `refundCode` dari response.

### 3.5 Query Void

```http
POST https://sandbox.atriptech.com/queryVoidOrders.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>",
  "voidCode": "<VOID_CODE>"
}
```

### 3.6 Query Refund

```http
POST https://sandbox.atriptech.com/queryRefundOrders.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>",
  "refundCode": "<REFUND_CODE>"
}
```

Status refund:

| Status | Meaning            |
| -----: | ------------------ |
|  `0` | Atlas processing   |
|  `1` | Airline processing |
|  `2` | Refunded           |
|  `4` | Rejected           |

## 4. Webhook

Gunakan webhook agar aplikasi menerima event tanpa polling terus-menerus ke
`queryOrderDetails.do`.

Webhook dapat memberi tahu event seperti:

- Ticket berhasil diterbitkan.
- Jadwal penerbangan berubah.
- Void atau refund berhasil.

### 4.1 Register Webhook

```http
POST https://sandbox.atriptech.com/updateWebhookURL.do
```

Request:

```json
{
  "url": "https://api.example.com/atlas/webhook"
}
```

Daftarkan URL yang dapat diakses Atlas dan siapkan handler yang aman serta
idempotent.

Test terverifikasi:

```text
updateWebhookURL.do: status 0
Webhook order: TESTA20260814163931149
Webhook orderStatus: 2
Webhook ticketStatus: 1
```

## 5. Seat Selection

```http
POST https://sandbox.atriptech.com/seatAvailability.do
```

Request:

```json
{
  "sessionId": "<SESSION_ID_DARI_VERIFY>"
}
```

Ambil seat dengan `seatStatus: "F"`, lalu kirim `productCode` ke
`order.do` sebagai ancillary.

```json
{
  "productCode": "SCI_SEAT_4B_6E_COK_DEL",
  "segmentIndex": 1
}
```

Seat dapat berubah menjadi unavailable antara availability check dan order.
Jika mendapat status `320`, ulangi verify dan ambil seat free terbaru.

## 6. Verified Post-booking Results

```text
ticketOrderNo
  -> postBookingAncillarySearch.do
  -> sessionId
  -> postBookingAncillaryOrder.do
  -> ancillary orderNo
```

```text
orderNo
  -> voidQuotation.do / refundQuotation.do
  -> voidOfferId / refundOfferId
  -> void.do / refund.do
  -> voidCode / refundCode
  -> queryVoidOrders.do / queryRefundOrders.do
```

Verified order:

```text
Post-ticketing baggage main order: TESTA20260814162854980
Post-ticketing ancillary order: TESTB20260814164508794
Ancillary product: SCI_BAG_3PC_15KG on segments 1 and 2
Ancillary total: USD 89.88
orderType: 6
Final orderStatus: 2
Final ticketStatus: 1
PNR: GEIW90
```

Post-ticketing search untuk order SM mengembalikan product `5KG`, `10KG`, dan
`15KG`; jangan mengirim product `20KG` atau `30KG` jika tidak ada di response.

Refund terverifikasi:

```text
Order: TESTA20260814162334779
Refund code: 202608-0021
Refund status: 0
Estimated refund: USD 176.86
```

Void terverifikasi:

```text
Order: TESTA20260814162214435
Void code: 202608-0020
Void status: 0
```

## 7. Identifier Flow

```text
Main ticket order
  -> ticketOrderNo
  -> postBookingAncillarySearch.do
  -> ancillary sessionId
  -> postBookingAncillaryOrder.do
  -> ancillary orderNo (orderType 6)
  -> pay.do
  -> queryOrderDetails.do
```

```text
Refund
  -> refundQuotation.do
  -> refundOfferId
  -> refund.do
  -> refundCode
  -> queryRefundOrders.do
```

```text
Void
  -> voidQuotation.do
  -> voidOfferId
  -> void.do
  -> voidCode
  -> queryVoidOrders.do
```

## 8. Operational Notes

- Gunakan Sandbox URL untuk development dan UAT.
- Jangan jalankan void, refund, atau ancillary order tanpa `orderNo` Sandbox.
- Validasi response `status`, `msg`, dan identifier sebelum lanjut ke tahap berikutnya.
- Simpan request ID dan response ID untuk audit UAT.
