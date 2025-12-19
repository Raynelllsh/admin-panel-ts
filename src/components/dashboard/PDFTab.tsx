"use client";

import {
  Section,
  Stack,
  Grid2Col,
  Title,
  InfoRow,
  LessonList,
  Input,
} from "@/components/entry-manager/document-editor";
import { EntriesWorkspace } from "@/components/entry-manager/entries-workspace";

function ReceiptContent() {
  return (
    <>
      <Title>Receipt</Title>

      <Section title="Basic Info">
        <Grid2Col>
          <Stack>
            <InfoRow label="Receipt No">
              <Input name="receiptNo" />
            </InfoRow>

            <InfoRow label="Student Name">
              <Input name="studentName" className="font-medium" />
            </InfoRow>

            <InfoRow label="Student Code">
              {/* Updated to match the new Firebase mapping (studentId) */}
              <Input name="studentId" />
            </InfoRow>

            <InfoRow label="Sex">
              <Input
                name="sex"
                type="dropdown"
                options={[
                  { label: "Male", value: "M" },
                  { label: "Female", value: "F" },
                ]}
              />
            </InfoRow>
          </Stack>

          <Stack>
            <InfoRow label="Issue Date">
              <Input name="issueDate" type="date" />
            </InfoRow>

            <InfoRow label="Course Code">
              <Input name="courseCode" />
            </InfoRow>

            <InfoRow label="Course Name">
              <Input name="courseName" />
            </InfoRow>
          </Stack>
        </Grid2Col>
      </Section>

      <Section title="Lesson Info">
        <Stack>
          <InfoRow label="Total Lessons">12 Lessons</InfoRow>
          <InfoRow label="Duration">45 Minutes / Lesson</InfoRow>
        </Stack>
        <LessonList />
      </Section>

      <Section title="Add-ons">
        <Stack>
          <InfoRow label="Item Name">
            15-minute studio headshot session for kids
          </InfoRow>
          <InfoRow label="Description">
            At least 5 photos in jpg format (with basic retouch)
          </InfoRow>
          <InfoRow label="Price" strikethrough={true}>
            HKD 500.00
          </InfoRow>
        </Stack>
      </Section>

      <Section title="Price">
        <Grid2Col>
          <Stack>
            <InfoRow label="Section Price">HKD 3480.00</InfoRow>
            <InfoRow label="Discount">HKD 960.00</InfoRow>
            <InfoRow label="Coupon">HKD 0.00</InfoRow>
          </Stack>

          <Stack>
            <InfoRow label="Paid Amount" bold>
              HKD 2,880.00
            </InfoRow>

            <InfoRow label="Payment Method">
              <Input name="paymentMethod" />
            </InfoRow>

            <InfoRow label="Payment Date">
              <Input name="paymentDate" type="datetime-local" />
            </InfoRow>
          </Stack>
        </Grid2Col>
      </Section>

      <Section title="Payment and Refunds">
        <Grid2Col>
          <Stack>
            <p className="font-semibold">Payment of Fees</p>
            <ul>
              <li>
                Fees must be paid in full before students may attend classes. We
                reserve the right to refuse entry to students if fees have not
                been paid on or before the first day of each term.
              </li>
              <li>
                For promotion offer / discounted booking, it is non-refundable,
                non-transferable and no cancellation.
              </li>
            </ul>
          </Stack>

          <Stack>
            <p className="font-semibold">Refunds</p>
            <ul>
              <li>
                We regret that we cannot, under any circumstances, give refunds
                for classes and credit already paid for.
              </li>
            </ul>
          </Stack>
        </Grid2Col>
      </Section>
    </>
  );
}

function CoursePlanContent() {
  return (
    <>
      <Title>Course Plan</Title>

      <Section title="Basic Info">
        <Grid2Col>
          <Stack>
            <InfoRow label="Student Name">
              <Input name="studentName" className="font-medium" />
            </InfoRow>

            <InfoRow label="Parent Contact">
              <Input name="parentContact" />
            </InfoRow>

            <InfoRow label="Sex">
              <Input
                name="sex"
                type="dropdown"
                options={[
                  { label: "Male", value: "M" },
                  { label: "Female", value: "F" },
                ]}
              />
            </InfoRow>
          </Stack>

          <Stack>
            <InfoRow label="Issue Date">
              <Input name="issueDate" type="date" />
            </InfoRow>

            <InfoRow label="Course Code">
              <Input name="courseCode" />
            </InfoRow>

            <InfoRow label="Course Name">
              <span className="font-medium">COURSE NAME</span>
            </InfoRow>
          </Stack>
        </Grid2Col>
      </Section>

      <Section title="Lesson Info">
        <Stack>
          <InfoRow label="Total Lessons">12 Lessons</InfoRow>
          <InfoRow label="Duration">45 Minutes / Lesson</InfoRow>
        </Stack>
        <LessonList />
      </Section>

      <Section title="Add-ons">
        <Stack>
          <InfoRow label="Item Name">
            15-minute studio headshot session for kids
          </InfoRow>
          <InfoRow label="Description">
            At least 5 photos in jpg format (with basic retouch)
          </InfoRow>
          <InfoRow label="Price" strikethrough={true}>
            HKD 500.00
          </InfoRow>
        </Stack>
      </Section>

      <Section title="Price">
        <Grid2Col>
          <Stack>
            <InfoRow label="Total Price">HKD 2,620.000</InfoRow>
            <InfoRow label="Discount">HKD 740.00</InfoRow>
          </Stack>

          <Stack>
            <InfoRow label="Discount Due Date" bold>
              31st August
            </InfoRow>
            <InfoRow label="Discounted Price">HKD 1880.00/student</InfoRow>
          </Stack>
        </Grid2Col>
      </Section>

      <Section title="Payment and Refunds">
        <Grid2Col>
          <Stack>
            <p className="font-semibold">Payment of Fees</p>
            <ul>
              <li>
                Fees must be paid in full before students may attend classes. We
                reserve the right to refuse entry to students if fees have not
                been paid on or before the first day of each term.
              </li>
              <li>
                For promotion offer / discounted booking, it is non-refundable,
                non-transferable and no cancellation.
              </li>
            </ul>
          </Stack>

          <Stack>
            <p className="font-semibold">Refunds</p>
            <ul>
              <li>
                We regret that we cannot, under any circumstances, give refunds
                for classes and credit already paid for.
              </li>
            </ul>
          </Stack>
        </Grid2Col>
      </Section>
    </>
  );
}

// --- Page: hand layouts to the EntriesWorkspace container ---
export default function Page() {
  return (
    <EntriesWorkspace
      ReceiptContent={ReceiptContent}
      CoursePlanContent={CoursePlanContent}
    />
  );
}
