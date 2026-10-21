import { IonItem, IonLabel, IonList } from '@ionic/react';
import { useTabHref } from '../navigation';

const ItemList: React.FC = () => {
  const tabHref = useTabHref();
  return (
    <IonList>
      {Array.from({ length: 30 }, (_, i) => i + 1).map((id) => (
        <IonItem key={id} routerLink={tabHref(`items/${id}`)} detail>
          <IonLabel>Item {id}</IonLabel>
        </IonItem>
      ))}
    </IonList>
  );
};

export default ItemList;
