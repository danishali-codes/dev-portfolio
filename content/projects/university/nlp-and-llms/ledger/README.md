# Ledger

NLP and LLMs, Assessment 2: NLP solution design.

## Problem

Ledger reads the SMS alerts UAE banks send after every card payment, puts each
expense into one of 12 spending categories with a calibrated confidence score,
asks about the uncertain ones, and answers questions like *"How much did I spend
on food in May 2025?"* through guarded, read-only SQL written by a small local LLM.

## Data

9,592 personal and 1,776 external expenses. The checks are a random 5-fold split,
a future split (train before 2025, test on 2025), an unseen person, an external
bank (ADIB), and unseen merchants.

## Approach

TF-IDF (character 2–5 and word 1–2 grams, plus log amount) with logistic
regression. Qwen2.5-1.5B-Instruct writes the SQL, and a guard keeps every query
read-only.

## Results

| Test set-up | Accuracy | Macro-F1 | Exact-lookup baseline |
| --- | --- | --- | --- |
| Random 5-fold | 97.7% | 94.9% | 90.0% |
| Future (train before 2025, test on 2025) | 93.6% | 89.2% | 79.6% |
| Unseen person | 89.2% | 80.3% | 60.6% |
| External bank (ADIB) | 71.3% | 59.4% | 19.1% |
| Unseen merchants | 55.5% | 51.2% | 4.1% |

- **Calibration:** on unseen merchants, a confidence of 0.7–0.8 was right 95% of
  the time, so 31% of brand-new merchants are filed automatically at 91% accuracy.
- **Text-to-SQL:** Qwen2.5-1.5B-Instruct wrote correct SQL for 20 of 30 questions,
  and a guard keeps every query read-only.
